export interface ProcessedChapter {
  title?: string;
  content: string;
  wordCount: number;
}

/**
 * Count words in a text string.
 * Accurately supports CJK (Chinese, Japanese, Korean) characters and Latin/spaced words.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  // Count CJK characters:
  // - Hanzi / Kanji / Hanja: \u4e00-\u9fa5, \u3400-\u4dbf (ext A)
  // - Japanese Hiragana: \u3040-\u309f
  // - Japanese Katakana: \u30a0-\u30ff
  // - Korean Hangul syllables: \uac00-\ud7af
  // - Korean Hangul Jamo: \u1100-\u11ff, \u3130-\u318f
  const cjkMatches = text.match(
    /[\u4e00-\u9fa5\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g
  );
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  const nonCjkText = text.replace(
    /[\u4e00-\u9fa5\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g,
    " "
  );
  const latinWords = nonCjkText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return cjkCount + latinWords;
}

export type HeadingPreset =
  | "auto"
  | "chinese"
  | "japanese"
  | "korean"
  | "cjk"
  | "indonesian"
  | "english"
  | "numeric"
  | "custom";

/**
 * Builds a regex pattern based on heading preset or custom pattern.
 */
export function buildChapterRegex(
  preset: HeadingPreset = "auto",
  customPattern: string = ""
): RegExp {
  if (preset === "custom" && customPattern.trim()) {
    try {
      const pattern = customPattern.trim();
      return new RegExp(`(?:^|\\n)[ \\t]*(${pattern}[^\\n]*)`, "gi");
    } catch {
      const escaped = customPattern
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\n)[ \\t]*(${escaped}[^\\n]*)`, "gi");
    }
  }

  // Chinese novel chapter patterns
  if (preset === "chinese") {
    return /(?:^|\n)[ \t]*((?:第\s*[0-9１-９零〇一二三四五六七八九十百千万]+\s*[章回节卷集部篇折]|(?:序章|终章|尾声|番外|后记|前言|楔子|引子))[^\n]*)/gi;
  }

  // Japanese light novel / web novel chapter patterns
  if (preset === "japanese") {
    return /(?:^|\n)[ \t]*((?:第\s*[0-9１-９零〇一二三四五六七八九十百千万]+\s*[話话章幕節巻篇]|(?:[0-9１-９]+|[零〇一二三四五六七八九十]+)\s*[話话]|(?:プロローグ|エピローグ|幕間|あとがき|序章|終章))[^\n]*)/gi;
  }

  // Korean web novel chapter patterns
  if (preset === "korean") {
    return /(?:^|\n)[ \t]*((?:(?:제\s*[0-9]+\s*[화장편부회]|[0-9]+\s*[화장편부회])(?:[.:\s\-]|$)|(?:프롤로그|에필로그|외전|후기|서막))[^\n]*)/gi;
  }

  // Combined CJK
  if (preset === "cjk") {
    return /(?:^|\n)[ \t]*((?:(?:제\s*[0-9]+\s*[화장편부회]|[0-9]+\s*[화장편부회])(?:[.:\s\-]|$)|(?:第\s*[0-9１-９零〇一二三四五六七八九十百千万]+\s*[章回节卷集部话話幕篇折]|(?:[0-9１-９]+|[零〇一二三四五六七八九十]+)\s*[話话])|(?:프롤로그|에필로그|외전|후기|서막|プロローグ|エピローグ|幕間|あとがき|序章|終章|终章|尾声|番外|后记|前言|楔子|引子))[^\n]*)/gi;
  }

  if (preset === "indonesian") {
    return /(?:^|\n)[ \t]*((?:(?:Bab|BAB|Bagian|BAGIAN|Episode|EPISODE)\s+(?:[0-9IVXLCDM]+|Satu|Dua|Tiga|Empat|Lima)|(?:Prolog|PROLOG|Epilog|EPILOG))[^\n]*)/gi;
  }

  if (preset === "english") {
    return /(?:^|\n)[ \t]*((?:(?:Chapter|CHAPTER|Ch\.|Ch|Part|PART|Book|BOOK|Volume|VOLUME|Vol\.|Act|ACT|Episode|EPISODE|Section|SECTION)\s+(?:[0-9IVXLCDM]+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|(?:Prologue|PROLOGUE|Epilogue|EPILOGUE|Interlude|INTERLUDE|Afterword))[^\n]*)/gi;
  }

  if (preset === "numeric") {
    return /(?:^|\n)[ \t]*((?:[0-9]{1,4}|[IVXLCDM]+)[.、\-:：\s][^\n]*)/gi;
  }

  // "auto": Comprehensive detection covering Indonesian, English, Chinese, Japanese, Korean, and special sections
  return /(?:^|\n)[ \t]*((?:(?:제\s*[0-9]+\s*[화장편부회]|[0-9]+\s*[화장편부회])(?:[.:\s\-]|$)|(?:第\s*[0-9１-９零〇一二三四五六七八九十百千万]+\s*[章回节卷集部话話幕篇折]|(?:[0-9１-９]+|[零〇一二三四五六七八九十]+)\s*[話话])|(?:Chapter|CHAPTER|Ch\.|Ch|Bab|BAB|Bagian|BAGIAN|Episode|EPISODE|Part|PART|Book|BOOK|Volume|VOLUME|Vol\.|Act|ACT|Section|SECTION)\s+(?:[0-9IVXLCDM]+|[零〇一二三四五六七八九十百千万]+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)|(?:프롤로그|에필로그|외전|후기|서막|プロローグ|エピローグ|幕間|あとがき|Prologue|PROLOGUE|Prolog|PROLOG|Epilogue|EPILOGUE|Epilog|EPILOG|Interlude|INTERLUDE|Afterword|序章|終章|终章|尾声|番外|后记|前言|楔子|引子))[^\n]*)/gi;
}

/**
 * Split novel text into chapters.
 * 1. Automatically detects natural chapter headings using customizable presets or custom patterns.
 * 2. Falls back to word-based splitting if no chapter markers are found.
 * Preserves newlines and paragraph structure.
 */
export function splitNovelIntoChapters(
  text: string,
  wordsPerChapter: number = 2000,
  forceWordSplit: boolean = false,
  headingPreset: HeadingPreset = "auto",
  customPattern: string = ""
): ProcessedChapter[] {
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return [];
  }

  // Build chapter regex according to preset/custom configuration
  const chapterRegex = buildChapterRegex(headingPreset, customPattern);
  const matches = [...normalizedText.matchAll(chapterRegex)];

  // If at least 2 chapter headings are found and forceWordSplit is false, split by chapters
  if (!forceWordSplit && matches.length >= 2) {
    const chapters: ProcessedChapter[] = [];

    // Check if there is prologue / preface before the first chapter
    const firstMatch = matches[0];
    const firstMatchStart =
      firstMatch.index! + (firstMatch[0].startsWith("\n") ? 1 : 0);
    const prologue = normalizedText.slice(0, firstMatchStart).trim();

    if (prologue.length > 0) {
      chapters.push({
        title: "Prologue / 序章",
        content: prologue,
        wordCount: countWords(prologue),
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const title = matches[i][1].trim();
      const startIndex =
        matches[i].index! + (matches[i][0].startsWith("\n") ? 1 : 0);
      const endIndex =
        i + 1 < matches.length
          ? matches[i + 1].index! +
            (matches[i + 1][0].startsWith("\n") ? 1 : 0)
          : normalizedText.length;
      const content = normalizedText.slice(startIndex, endIndex).trim();

      chapters.push({
        title,
        content,
        wordCount: countWords(content),
      });
    }

    return chapters;
  }

  // Fallback: split into chapters of approximately wordsPerChapter words
  const paragraphs = normalizedText.split(/\n/);

  const chapters: ProcessedChapter[] = [];
  let currentChapterParagraphs: string[] = [];
  let currentWordCount = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWordCount = countWords(paragraph);

    // If adding this paragraph exceeds the limit and we have content
    if (
      currentWordCount + paragraphWordCount > wordsPerChapter &&
      currentChapterParagraphs.length > 0
    ) {
      chapters.push({
        title: `Chapter ${chapters.length + 1}`,
        content: currentChapterParagraphs.join("\n"),
        wordCount: currentWordCount,
      });

      currentChapterParagraphs = [];
      currentWordCount = 0;
    }

    // Add paragraph to current chapter
    currentChapterParagraphs.push(paragraph);
    currentWordCount += paragraphWordCount;
  }

  // Don't forget the last chapter
  if (currentChapterParagraphs.length > 0) {
    chapters.push({
      title: `Chapter ${chapters.length + 1}`,
      content: currentChapterParagraphs.join("\n"),
      wordCount: currentWordCount,
    });
  }

  return chapters;
}

/**
 * Extract suggested title from text (first line or first few words).
 */
export function extractTitle(text: string, filename: string): string {
  // First try to get from filename (remove .txt extension)
  const filenameTitle = filename.replace(/\.txt$/i, "").trim();

  if (
    filenameTitle &&
    filenameTitle.length > 0 &&
    filenameTitle.length <= 100
  ) {
    return filenameTitle;
  }

  // Otherwise try first non-empty line of text
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Use first line if it's a reasonable title length
    if (firstLine.length <= 100) {
      return firstLine;
    }
    // Otherwise use first few words
    return firstLine.split(/\s+/).slice(0, 10).join(" ") + "...";
  }

  return "Untitled Novel";
}
