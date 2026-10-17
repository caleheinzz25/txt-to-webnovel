import * as fflate from "fflate";
import { countWords } from "./textProcessor";

export interface EpubChapter {
	title: string;
	name: string;
	content: string;
	wordCount: number;
}

export interface ProcessedEpub {
	title: string;
	author?: string;
	chapters: EpubChapter[];
	totalWords: number;
}

/**
 * Resolves a relative path inside an EPUB archive against the OPF base directory.
 * Strips URL hash anchors and handles percent-decoding and ".." segments.
 */
function resolveZipPath(baseDir: string, relativePath: string): string {
	let decoded = relativePath;
	try {
		decoded = decodeURIComponent(relativePath);
	} catch {
		// keep original if decoding fails
	}

	const cleanPath = decoded.split("#")[0]?.trim();
	if (!cleanPath) return "";

	const combined = baseDir ? `${baseDir}/${cleanPath}` : cleanPath;
	const parts = combined.split("/");
	const resolved: string[] = [];

	for (const part of parts) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			resolved.pop();
		} else {
			resolved.push(part);
		}
	}

	return resolved.join("/");
}

/**
 * Converts XHTML/HTML content from an EPUB chapter into clean plain text
 * with double newlines between paragraphs, suitable for web novel reading.
 */
function htmlToChapterText(html: string): string {
	// 1. Remove <script> and <style> tags and their inner content
	let text = html.replace(
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		"",
	);
	text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

	// 2. Remove pronunciation ruby annotations (<rt>) to preserve clean main text
	text = text.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "");

	// 3. Normalize breaks and block endings to newlines
	text = text.replace(/<br\s*[\/]?>/gi, "\n");
	text = text.replace(
		/<\/(?:p|div|h[1-6]|li|blockquote|tr|section|article)>/gi,
		"\n\n",
	);

	// 4. Strip all remaining HTML tags
	text = text.replace(/<[^>]+>/g, "");

	// 5. Decode common HTML entities
	text = text
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&ldquo;|&rdquo;/gi, '"')
		.replace(/&lsquo;|&rsquo;/gi, "'")
		.replace(/&mdash;/gi, "—")
		.replace(/&ndash;/gi, "–")
		.replace(/&hellip;/gi, "…")
		.replace(/&bull;/gi, "•")
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCharCode(Number.parseInt(code, 10)),
		)
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
			String.fromCharCode(Number.parseInt(hex, 16)),
		);

	// 6. Normalize paragraph spacing and trim whitespace
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join("\n\n");
}

/**
 * Parses an EPUB binary buffer and extracts the novel title, author,
 * and structured chapters in sequential reading order.
 */
export function parseEpubBuffer(buffer: Buffer): ProcessedEpub {
	const unzipped = fflate.unzipSync(new Uint8Array(buffer));

	// 1. Locate the package file (.opf) from META-INF/container.xml
	let opfPath = "";
	if (unzipped["META-INF/container.xml"]) {
		const containerXml = fflate.strFromU8(unzipped["META-INF/container.xml"]);
		const match = containerXml.match(/full-path=["']([^"']+)["']/i);
		if (match) opfPath = match[1].trim();
	}

	// Fallback: look for any .opf file in the archive
	if (!opfPath) {
		const found = Object.keys(unzipped).find((k) =>
			k.toLowerCase().endsWith(".opf"),
		);
		if (found) opfPath = found;
	}

	if (!opfPath || !unzipped[opfPath]) {
		throw new Error(
			"Format EPUB tidak valid: berkas definisi paket (.opf) tidak ditemukan.",
		);
	}

	const opfDir = opfPath.includes("/")
		? opfPath.substring(0, opfPath.lastIndexOf("/"))
		: "";
	const opfContent = fflate.strFromU8(unzipped[opfPath]);

	// 2. Extract Title & Author from metadata
	let title = "Untitled Novel";
	const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
	if (titleMatch) {
		const cleaned = titleMatch[1].replace(/<[^>]+>/g, "").trim();
		if (cleaned) title = cleaned;
	}

	let author: string | undefined;
	const creatorMatch = opfContent.match(
		/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i,
	);
	if (creatorMatch) {
		const cleaned = creatorMatch[1].replace(/<[^>]+>/g, "").trim();
		if (cleaned) author = cleaned;
	}

	// 3. Parse Manifest: map item ID to relative href
	const manifest = new Map<string, string>();
	const itemRegex = /<item\b([^>]+?)\/?>/gi;
	let itemMatch: RegExpExecArray | null;
	let tocHref = "";
	let navHref = "";

	while (true) {
		itemMatch = itemRegex.exec(opfContent);
		if (!itemMatch) break;

		const attrs = itemMatch[1];
		const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
		const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
		const mediaTypeMatch = attrs.match(/\bmedia-type=["']([^"']+)["']/i);
		const propertiesMatch = attrs.match(/\bproperties=["']([^"']+)["']/i);

		if (idMatch && hrefMatch) {
			const id = idMatch[1];
			const href = hrefMatch[1];
			manifest.set(id, href);

			if (mediaTypeMatch && mediaTypeMatch[1].includes("dtbncx")) {
				tocHref = href;
			}
			if (propertiesMatch && propertiesMatch[1].includes("nav")) {
				navHref = href;
			}
		}
	}

	// 4. Build Table of Contents map (normalized filePath -> chapterTitle)
	const tocTitles = new Map<string, string>();

	// 4a. Parse EPUB 2 NCX TOC
	if (tocHref) {
		const resolvedTocPath = resolveZipPath(opfDir, tocHref);
		if (unzipped[resolvedTocPath]) {
			const ncxContent = fflate.strFromU8(unzipped[resolvedTocPath]);
			const navPointRegex =
				/<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\s+src=["']([^"']+)["']/gi;
			let npMatch: RegExpExecArray | null;
			while (true) {
				npMatch = navPointRegex.exec(ncxContent);
				if (!npMatch) break;
				const label = npMatch[1].replace(/<[^>]+>/g, "").trim();
				const targetPath = resolveZipPath(opfDir, npMatch[2]);
				if (label && targetPath && !tocTitles.has(targetPath)) {
					tocTitles.set(targetPath, label);
				}
			}
		}
	}

	// 4b. Parse EPUB 3 Navigation Document TOC
	if (navHref) {
		const resolvedNavPath = resolveZipPath(opfDir, navHref);
		if (unzipped[resolvedNavPath]) {
			const navContent = fflate.strFromU8(unzipped[resolvedNavPath]);
			const aRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
			let aMatch: RegExpExecArray | null;
			while (true) {
				aMatch = aRegex.exec(navContent);
				if (!aMatch) break;
				const targetPath = resolveZipPath(opfDir, aMatch[1]);
				const label = aMatch[2].replace(/<[^>]+>/g, "").trim();
				if (label && targetPath && !tocTitles.has(targetPath)) {
					tocTitles.set(targetPath, label);
				}
			}
		}
	}

	// 5. Read chapters in sequential order defined by <spine>
	const spineRegex = /<itemref\b[^>]+?\bidref=["']([^"']+)["']/gi;
	let spineMatch: RegExpExecArray | null;
	const chapters: EpubChapter[] = [];
	let chapterCount = 1;

	while (true) {
		spineMatch = spineRegex.exec(opfContent);
		if (!spineMatch) break;

		const idref = spineMatch[1];
		const href = manifest.get(idref);
		if (!href) continue;

		const fullPath = resolveZipPath(opfDir, href);
		if (!unzipped[fullPath]) continue;

		const rawHtml = fflate.strFromU8(unzipped[fullPath]);
		let content = htmlToChapterText(rawHtml);

		// Skip empty pages (e.g. cover page without text, blank dividers)
		if (content.length < 10) continue;

		// Determine chapter title
		let chapTitle = tocTitles.get(fullPath);

		if (!chapTitle) {
			// Try extracting from <h1> or <h2> inside the chapter HTML
			const headingMatch = rawHtml.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
			if (headingMatch) {
				const cleaned = headingMatch[1].replace(/<[^>]+>/g, "").trim();
				if (cleaned.length > 0 && cleaned.length < 150) {
					chapTitle = cleaned;
				}
			}
		}

		if (!chapTitle) {
			// Try extracting from <title> tag
			const titleTagMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
			if (titleTagMatch) {
				const cleaned = titleTagMatch[1].replace(/<[^>]+>/g, "").trim();
				if (
					cleaned.length > 0 &&
					cleaned.length < 150 &&
					cleaned !== title
				) {
					chapTitle = cleaned;
				}
			}
		}

		if (!chapTitle) {
			chapTitle = `Bab ${chapterCount}`;
		}

		// Avoid duplicating the chapter title as the first paragraph of content
		if (content.startsWith(chapTitle)) {
			content = content.slice(chapTitle.length).trim();
		}

		const wordCount = countWords(content);
		if (wordCount > 0) {
			chapters.push({
				title: chapTitle,
				name: chapTitle,
				content,
				wordCount,
			});
			chapterCount++;
		}
	}

	if (chapters.length === 0) {
		throw new Error(
			"Tidak dapat menemukan bab atau konten teks yang dapat dibaca di dalam berkas EPUB.",
		);
	}

	const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

	return {
		title,
		author,
		chapters,
		totalWords,
	};
}
