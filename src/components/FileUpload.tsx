import { createSignal, onCleanup } from "solid-js";
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-solid";

interface FileUploadProps {
  onUploadSuccess?: (novelId: string) => void;
  onUploadError?: (error: string) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function FileUpload(props: FileUploadProps) {
  const [file, setFile] = createSignal<File | null>(null);
  const [isDragActive, setIsDragActive] = createSignal(false);
  const [status, setStatus] = createSignal<UploadStatus>("idle");
  const [splitMode, setSplitMode] = createSignal<"fixed_words" | "auto_heading">("fixed_words");
  const [wordsPerChapter, setWordsPerChapter] = createSignal(2000);
  const [headingPreset, setHeadingPreset] = createSignal<
    | "auto"
    | "chinese"
    | "japanese"
    | "korean"
    | "cjk"
    | "indonesian"
    | "english"
    | "numeric"
    | "custom"
  >("auto");
  const [customPattern, setCustomPattern] = createSignal("");
  const [encoding, setEncoding] = createSignal("auto");
  const [progress, setProgress] = createSignal(0);
  const [message, setMessage] = createSignal("");

  let fileInputRef: HTMLInputElement | undefined;
  let progressTimer: any = null;

  onCleanup(() => {
    if (progressTimer) clearInterval(progressTimer);
  });

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
      setStatus("error");
      setMessage("Hanya file format .txt yang diperbolehkan.");
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setMessage("");
  };

  const handleUpload = async () => {
    const currentFile = file();
    if (!currentFile) return;

    setStatus("uploading");
    setProgress(0);
    setMessage("");

    const isFixedWords = splitMode() === "fixed_words";
    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("forceWordSplit", isFixedWords ? "true" : "false");
    formData.append("wordsPerChapter", wordsPerChapter().toString());
    formData.append("headingPreset", isFixedWords ? "auto" : headingPreset());
    formData.append("encoding", encoding());
    if (!isFixedWords && headingPreset() === "custom" && customPattern().trim()) {
      formData.append("customPattern", customPattern().trim());
    }

    try {
      progressTimer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 95));
      }, 300);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.message) errorMsg = errData.message;
        } catch {
          if (response.status === 413) {
            errorMsg = "Ukuran file terlalu besar untuk server (413 Payload Too Large).";
          } else if (response.status === 504) {
            errorMsg = "Proses upload memakan waktu terlalu lama (504 Timeout).";
          }
        }
        setStatus("error");
        setMessage(errorMsg);
        props.onUploadError?.(errorMsg);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setProgress(100);
        setStatus("success");
        setMessage(result.message || `${result.data?.totalChapters || 0} bab berhasil dibuat`);
        props.onUploadSuccess?.(result.novelId);

        setTimeout(() => {
          setFile(null);
          setStatus("idle");
          setProgress(0);
          setMessage("");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.message || "Gagal memproses file.");
        props.onUploadError?.(result.message);
      }
    } catch (error) {
      const errMsg =
        error instanceof Error
          ? error.message
          : "Upload gagal. Silakan periksa koneksi dan coba lagi.";
      setStatus("error");
      setMessage(errMsg);
      props.onUploadError?.(errMsg);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    if (fileInputRef) fileInputRef.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div class="upload-container">
      <div
        class={`dropzone ${isDragActive() ? "dropzone-active" : ""} ${
          file() ? "dropzone-has-file" : ""
        }`}
        onClick={() => {
          if (!file()) fileInputRef?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.currentTarget.files && e.currentTarget.files.length > 0) {
              handleFileSelect(e.currentTarget.files[0]);
            }
          }}
        />

        {!file() ? (
          <div class="dropzone-content">
            <div class="dropzone-icon">
              <Upload size={48} />
            </div>
            <p class="dropzone-text">
              {isDragActive()
                ? "Drop your TXT file here..."
                : "Drag & drop a TXT file here, or click to select"}
            </p>
            <p class="dropzone-hint">Max file size: 50MB</p>
          </div>
        ) : (
          <div class="file-preview" onClick={(e) => e.stopPropagation()}>
            <div class="file-info">
              <FileText size={32} class="file-icon" />
              <div class="file-details">
                <p class="file-name">{file()!.name}</p>
                <p class="file-size">{formatFileSize(file()!.size)}</p>
              </div>
            </div>
            {status() === "idle" && (
              <button
                onClick={handleRemove}
                class="remove-btn"
                type="button"
                aria-label="Hapus file"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {file() && (
        <div class="upload-actions">
          {status() === "uploading" && (
            <div class="progress-container">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style={{ width: `${progress()}%` }}
                />
              </div>
              <span class="progress-text">{progress()}%</span>
            </div>
          )}

          {status() === "success" && (
            <div class="status-message success">
              <CheckCircle size={20} />
              <span>{message()}</span>
            </div>
          )}

          {status() === "error" && (
            <div class="status-message error">
              <AlertCircle size={20} />
              <span>{message()}</span>
            </div>
          )}

          {(status() === "idle" || status() === "error") && (
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                gap: "0.75rem",
                "margin-bottom": "0.75rem",
                width: "100%",
                "max-width": "460px",
                padding: "1rem",
                background: "var(--bg-primary)",
                "border-radius": "14px",
                border: "1px solid var(--border-color)",
                "box-shadow": "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Selector 2 Opsi */}
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  gap: "0.35rem",
                  background: "var(--bg-secondary)",
                  padding: "0.3rem",
                  "border-radius": "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSplitMode("fixed_words")}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.5rem",
                    "border-radius": "8px",
                    border: "none",
                    background:
                      splitMode() === "fixed_words"
                        ? "var(--accent-primary)"
                        : "transparent",
                    color:
                      splitMode() === "fixed_words"
                        ? "white"
                        : "var(--text-secondary)",
                    "font-weight": 600,
                    "font-size": "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Fixed Word Count
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode("auto_heading")}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.5rem",
                    "border-radius": "8px",
                    border: "none",
                    background:
                      splitMode() === "auto_heading"
                        ? "var(--accent-primary)"
                        : "transparent",
                    color:
                      splitMode() === "auto_heading"
                        ? "white"
                        : "var(--text-secondary)",
                    "font-weight": 600,
                    "font-size": "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Deteksi Heading
                </button>
              </div>

              {splitMode() === "fixed_words" ? (
                <div style={{ width: "100%", display: "flex", "flex-direction": "column", gap: "0.5rem" }}>
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "space-between",
                      width: "100%",
                      "font-size": "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Target Kata / Bab:</span>
                    <input
                      type="number"
                      min={200}
                      max={50000}
                      step={500}
                      value={wordsPerChapter()}
                      onInput={(e) =>
                        setWordsPerChapter(
                          Math.max(100, parseInt(e.currentTarget.value, 10) || 100)
                        )
                      }
                      style={{
                        width: "90px",
                        padding: "0.35rem 0.5rem",
                        "border-radius": "8px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        "font-weight": 600,
                        "text-align": "center",
                        "font-size": "0.9rem",
                      }}
                    />
                  </div>

                  {/* Preset chips for fast tap */}
                  <div style={{ display: "flex", gap: "0.35rem", width: "100%" }}>
                    {[1000, 2000, 3000, 5000].map((preset) => (
                      <button
                        type="button"
                        onClick={() => setWordsPerChapter(preset)}
                        style={{
                          flex: 1,
                          padding: "0.35rem 0.25rem",
                          "border-radius": "6px",
                          border: "1px solid var(--border-color)",
                          background: wordsPerChapter() === preset ? "var(--accent-primary)" : "var(--bg-secondary)",
                          color: wordsPerChapter() === preset ? "white" : "var(--text-secondary)",
                          "font-size": "0.75rem",
                          "font-weight": 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "space-between",
                      width: "100%",
                      "font-size": "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Format Penanda:</span>
                    <select
                      value={headingPreset()}
                      onChange={(e) => setHeadingPreset(e.currentTarget.value as any)}
                      style={{
                        padding: "0.35rem 0.5rem",
                        "border-radius": "6px",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                        "font-size": "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <option value="auto">Auto-Detect</option>
                      <option value="chinese">Chinese (第X章)</option>
                      <option value="japanese">Japanese (第X話)</option>
                      <option value="korean">Korean (X화)</option>
                      <option value="indonesian">Bab (Indo)</option>
                      <option value="english">Chapter (Eng)</option>
                      <option value="numeric">1., 2. (Numbers)</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>

                  {headingPreset() === "custom" && (
                    <div style={{ width: "100%", "margin-top": "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="e.g. Arc \d+|STAGE \d+"
                        value={customPattern()}
                        onInput={(e) => setCustomPattern(e.currentTarget.value)}
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.5rem",
                          "border-radius": "6px",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          "font-size": "0.85rem",
                          "font-family": "monospace",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Encoding Selector Row */}
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "space-between",
                  width: "100%",
                  "font-size": "0.85rem",
                  color: "var(--text-secondary)",
                  "padding-top": "0.6rem",
                  "border-top": "1px dashed var(--border-color)",
                }}
              >
                <span>Encoding / Karakter:</span>
                <select
                  value={encoding()}
                  onChange={(e) => setEncoding(e.currentTarget.value)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    "border-radius": "6px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    "font-size": "0.825rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="auto">Auto-Detect (Rekomendasi)</option>
                  <option value="gb18030">GBK / GB18030 (Chinese / 中文)</option>
                  <option value="utf-8">UTF-8 Standar</option>
                  <option value="big5">Big5 (Trad. Chinese / 繁體)</option>
                  <option value="shift_jis">Shift-JIS (Japanese / 日本語)</option>
                  <option value="euc-kr">EUC-KR (Korean / 한국어)</option>
                </select>
              </div>
            </div>
          )}

          {(status() === "idle" || status() === "error") && (
            <button onClick={handleUpload} class="upload-btn" type="button">
              <Upload size={20} />
              {status() === "error" ? "Coba Lagi (Retry Upload)" : "Upload & Process"}
            </button>
          )}

          {status() === "uploading" && (
            <button disabled class="upload-btn uploading" type="button">
              <Loader2 size={20} class="spin" />
              Processing...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
