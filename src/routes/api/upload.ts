import { createFileRoute } from "@tanstack/solid-router";
import type { ObjectId } from "mongodb";
import { decodeTextBuffer } from "../../lib/encoding";
import { createManyChapters } from "../../lib/models/chapters";
import { createNovel } from "../../lib/models/novels";
import {
	deleteUploadChunks,
	getUploadChunks,
	saveUploadChunk,
} from "../../lib/models/uploadChunks";
import {
	extractTitle,
	type HeadingPreset,
	splitNovelIntoChapters,
} from "../../lib/textProcessor";

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "52428800", 10); // 50MB default

async function processAndSaveNovel(params: {
	buffer: Buffer;
	fileName: string;
	customTitle: string | null;
	encodingParam: string;
	wordsPerChapter: number;
	forceWordSplit: boolean;
	headingPreset: HeadingPreset;
	customPattern: string;
}) {
	const {
		buffer,
		fileName,
		customTitle,
		encodingParam,
		wordsPerChapter,
		forceWordSplit,
		headingPreset,
		customPattern,
	} = params;

	// Read and decode file buffer with auto-encoding detection
	const { text, encoding } = decodeTextBuffer(buffer, encodingParam);

	if (!text.trim()) {
		return Response.json(
			{
				success: false,
				message: "File is empty or could not be decoded",
			},
			{ status: 400 },
		);
	}

	// Extract title from filename or text
	const title = customTitle || extractTitle(text, fileName);

	// Split into chapters
	const processedChapters = splitNovelIntoChapters(
		text,
		wordsPerChapter,
		forceWordSplit,
		headingPreset,
		customPattern,
	);

	if (processedChapters.length === 0) {
		return Response.json(
			{
				success: false,
				message: "Could not extract any content from file",
			},
			{ status: 400 },
		);
	}

	// Calculate total word count
	const totalWords = processedChapters.reduce(
		(sum, ch) => sum + ch.wordCount,
		0,
	);

	// Create novel document
	const novel = await createNovel({
		name: title,
		totalChapters: processedChapters.length,
		totalWords,
	});

	// Create chapter documents
	const chapters = processedChapters.map((ch, index) => ({
		novelId: novel._id as ObjectId,
		name: ch.title || `Chapter ${index + 1}`,
		chap: index + 1,
		content: ch.content,
		wordCount: ch.wordCount,
	}));

	await createManyChapters(chapters);

	return Response.json({
		success: true,
		novelId: novel._id.toString(),
		message: `Successfully created novel with ${processedChapters.length} chapters (${encoding.toUpperCase()})`,
		data: {
			title: novel.name,
			totalChapters: novel.totalChapters,
			totalWords: novel.totalWords,
			encoding,
		},
	});
}

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const formData = await request.formData();
					const action = formData.get("action") as string | null;

					// 1. Chunk upload endpoint
					if (action === "chunk") {
						const uploadId = formData.get("uploadId") as string | null;
						const chunkIndexRaw = formData.get("chunkIndex") as string | null;
						const totalChunksRaw = formData.get("totalChunks") as string | null;
						const chunkFile = formData.get("chunk") as File | Blob | null;

						if (
							!uploadId ||
							chunkIndexRaw === null ||
							totalChunksRaw === null ||
							!chunkFile
						) {
							return Response.json(
								{ success: false, message: "Invalid chunk payload" },
								{ status: 400 },
							);
						}

						const chunkIndex = parseInt(chunkIndexRaw, 10);
						const totalChunks = parseInt(totalChunksRaw, 10);
						const arrayBuffer = await chunkFile.arrayBuffer();
						const buffer = Buffer.from(arrayBuffer);

						await saveUploadChunk(uploadId, chunkIndex, totalChunks, buffer);

						return Response.json({
							success: true,
							chunkIndex,
							totalChunks,
						});
					}

					// 2. Complete endpoint for chunked uploads
					if (action === "complete") {
						const uploadId = formData.get("uploadId") as string | null;
						const fileName =
							(formData.get("fileName") as string) || "novel.txt";
						const customTitle = formData.get("title") as string | null;
						const encodingParam =
							(formData.get("encoding") as string) || "auto";
						const wordsPerChapterRaw = formData.get("wordsPerChapter") as
							| string
							| null;
						const wordsPerChapter = wordsPerChapterRaw
							? Math.max(100, Math.min(50000, parseInt(wordsPerChapterRaw, 10)))
							: 2000;
						const forceWordSplitRaw = formData.get("forceWordSplit") as
							| string
							| null;
						const forceWordSplit = forceWordSplitRaw === "true";
						const headingPreset =
							(formData.get("headingPreset") as HeadingPreset) || "auto";
						const customPattern =
							(formData.get("customPattern") as string) || "";

						if (!uploadId) {
							return Response.json(
								{ success: false, message: "No uploadId provided" },
								{ status: 400 },
							);
						}

						const fullBuffer = await getUploadChunks(uploadId);
						if (!fullBuffer) {
							return Response.json(
								{
									success: false,
									message:
										"Potongan file tidak lengkap atau gagal dirangkai. Silakan coba upload lagi.",
								},
								{ status: 400 },
							);
						}

						// Asynchronously cleanup chunks to free up space
						void deleteUploadChunks(uploadId);

						if (fullBuffer.length > MAX_FILE_SIZE) {
							return Response.json(
								{
									success: false,
									message: `Ukuran file melebihi batas maksimum (${
										MAX_FILE_SIZE / 1024 / 1024
									}MB)`,
								},
								{ status: 400 },
							);
						}

						return await processAndSaveNovel({
							buffer: fullBuffer,
							fileName,
							customTitle,
							encodingParam,
							wordsPerChapter,
							forceWordSplit,
							headingPreset,
							customPattern,
						});
					}

					// 3. Direct upload (files <= 3MB)
					const file = formData.get("file") as File | null;
					const customTitle = formData.get("title") as string | null;
					const encodingParam = (formData.get("encoding") as string) || "auto";
					const wordsPerChapterRaw = formData.get("wordsPerChapter") as
						| string
						| null;
					const wordsPerChapter = wordsPerChapterRaw
						? Math.max(100, Math.min(50000, parseInt(wordsPerChapterRaw, 10)))
						: 2000;
					const forceWordSplitRaw = formData.get("forceWordSplit") as
						| string
						| null;
					const forceWordSplit = forceWordSplitRaw === "true";
					const headingPreset =
						(formData.get("headingPreset") as HeadingPreset) || "auto";
					const customPattern = (formData.get("customPattern") as string) || "";

					if (!file) {
						return Response.json(
							{ success: false, message: "No file provided" },
							{ status: 400 },
						);
					}

					// Validate file type
					if (!file.name.endsWith(".txt") && file.type !== "text/plain") {
						return Response.json(
							{ success: false, message: "Only TXT files are allowed" },
							{ status: 400 },
						);
					}

					// Validate file size
					if (file.size > MAX_FILE_SIZE) {
						return Response.json(
							{
								success: false,
								message: `File size exceeds maximum allowed (${
									MAX_FILE_SIZE / 1024 / 1024
								}MB)`,
							},
							{ status: 400 },
						);
					}

					const arrayBuffer = await file.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);

					return await processAndSaveNovel({
						buffer,
						fileName: file.name,
						customTitle,
						encodingParam,
						wordsPerChapter,
						forceWordSplit,
						headingPreset,
						customPattern,
					});
				} catch (error) {
					console.error("Upload error:", error);
					return Response.json(
						{
							success: false,
							message: "Failed to process file. Please try again.",
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
