import iconv from "iconv-lite";
import jschardet from "jschardet";

export interface DecodeResult {
  text: string;
  encoding: string;
}

/**
 * Decode a file buffer into string with automatic character encoding detection.
 * Supports UTF-8, UTF-16, GBK/GB2312/GB18030 (Chinese), Big5 (Trad. Chinese),
 * Shift_JIS/CP932 (Japanese), EUC-KR/CP949 (Korean), and Windows Latin encodings.
 */
export function decodeTextBuffer(
  buffer: Buffer,
  requestedEncoding: string = "auto"
): DecodeResult {
  // If user explicitly specified an encoding other than "auto"
  if (requestedEncoding && requestedEncoding !== "auto") {
    const requested = requestedEncoding.toLowerCase().trim();
    if (iconv.encodingExists(requested)) {
      try {
        const decoded = iconv.decode(buffer, requested);
        return { text: stripBom(decoded), encoding: requested };
      } catch (err) {
        console.warn(`Failed to decode with requested encoding ${requested}:`, err);
      }
    }
  }

  // 1. Check for Byte Order Mark (BOM)
  // UTF-8 BOM: 0xEF, 0xBB, 0xBF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return {
      text: stripBom(buffer.subarray(3).toString("utf8")),
      encoding: "utf-8",
    };
  }

  // UTF-16LE BOM: 0xFF, 0xFE
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return {
      text: stripBom(iconv.decode(buffer.subarray(2), "utf-16le")),
      encoding: "utf-16le",
    };
  }

  // UTF-16BE BOM: 0xFE, 0xFF
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return {
      text: stripBom(iconv.decode(buffer.subarray(2), "utf-16be")),
      encoding: "utf-16be",
    };
  }

  // 2. Try strict UTF-8 validation
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const utf8Text = utf8Decoder.decode(buffer);
    return { text: stripBom(utf8Text), encoding: "utf-8" };
  } catch {
    // If strict UTF-8 fails with fatal: true, the buffer contains non-UTF-8 bytes
    // (most likely GBK / GB18030, Big5, Shift-JIS, or EUC-KR)
  }

  // 3. Smart detection using jschardet
  // Sample up to 64KB for speed and high detection accuracy
  const sample = buffer.length > 65536 ? buffer.subarray(0, 65536) : buffer;
  const detected = jschardet.detect(sample);

  let targetEncoding = "gb18030"; // default fallback for East Asian TXT web novels

  if (detected && detected.encoding) {
    const rawName = String(detected.encoding).toLowerCase().trim();
    if (rawName.includes("gb") || rawName.includes("chinese") || rawName === "windows-936") {
      targetEncoding = "gb18030";
    } else if (iconv.encodingExists(rawName)) {
      targetEncoding = rawName;
    }
  }

  try {
    const decoded = iconv.decode(buffer, targetEncoding);
    return { text: stripBom(decoded), encoding: targetEncoding };
  } catch {
    // Fallback to GB18030 (superset of GBK and GB2312)
    const fallbackDecoded = iconv.decode(buffer, "gb18030");
    return { text: stripBom(fallbackDecoded), encoding: "gb18030" };
  }
}

function stripBom(str: string): string {
  if (str.charCodeAt(0) === 0xfeff) {
    return str.slice(1);
  }
  return str;
}
