import { createFileRoute, Link } from '@tanstack/solid-router'
import { createSignal, createMemo, onMount } from 'solid-js'
import {
  ChevronLeft,
  BookOpen,
  FileText,
  Calendar,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ArrowUpDown,
  XCircle,
  Play,
} from 'lucide-solid'
import ThemeSelector from '../components/ThemeSelector'

export const Route = createFileRoute('/novel/$id/')({
  component: NovelDetailPage,
})

interface Chapter {
  _id: string
  name: string
  chap: number
  wordCount: number
}

interface Novel {
  _id: string
  name: string
  totalChapters: number
  totalWords: number
  createdAt: string
  chapters: Chapter[]
}

function NovelDetailPage() {
  const params = Route.useParams()
  const novelId = () => params().id

  const [novel, setNovel] = createSignal<Novel | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  // Chapter list filter & sort
  const [chapterSearch, setChapterSearch] = createSignal("")
  const [chapterAscending, setChapterAscending] = createSignal(true)

  // Split mode state
  const [splitMode, setSplitMode] = createSignal<"fixed_words" | "auto_heading">("fixed_words")
  const [wordsPerChapter, setWordsPerChapter] = createSignal(2000)
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
  >("auto")
  const [customPattern, setCustomPattern] = createSignal("")
  const [resplitting, setResplitting] = createSignal(false)
  const [resplitStatus, setResplitStatus] = createSignal<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const fetchNovel = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId()}`)
      const data = await response.json()

      if (data.success) {
        setNovel(data.data)
      } else {
        setError(data.message || "Novel not found")
      }
    } catch {
      setError("Failed to load novel")
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    fetchNovel()
  })

  const handleResplit = async (
    targetMode: "fixed_words" | "auto_heading" = splitMode()
  ) => {
    const currentNovel = novel()
    if (!currentNovel || resplitting()) return

    setResplitting(true)
    setResplitStatus(null)

    const isFixedWords = targetMode === "fixed_words"

    try {
      const response = await fetch(`/api/novels/${novelId()}/resplit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordsPerChapter: wordsPerChapter(),
          forceWordSplit: isFixedWords,
          headingPreset: isFixedWords ? "auto" : headingPreset(),
          customPattern: isFixedWords ? "" : customPattern(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNovel(data.data)
        setResplitStatus({
          type: "success",
          message:
            data.message ||
            `Berhasil membagi ulang menjadi ${data.data.totalChapters} bab!`,
        })
      } else {
        setResplitStatus({
          type: "error",
          message: data.message || "Gagal memproses pemisahan bab",
        })
      }
    } catch {
      setResplitStatus({
        type: "error",
        message: "Gagal terhubung dengan server",
      })
    } finally {
      setResplitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatWordCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M"
    if (count >= 1000) return (count / 1000).toFixed(1) + "K"
    return count.toString()
  }

  const filteredChapters = createMemo(() => {
    const n = novel()
    if (!n) return []
    let list = n.chapters || []

    const q = chapterSearch().toLowerCase().trim()
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.chap.toString().includes(q)
      )
    }

    if (!chapterAscending()) {
      list = [...list].reverse()
    }

    return list
  })

  return (
    <main class="main-container">
      {/* Top Navigation */}
      <nav class="app-navbar" style={{ "border-radius": "16px", "margin-bottom": "1.5rem" }}>
        <Link to="/" class="app-navbar-brand">
          <ChevronLeft size={20} />
          <span>Library</span>
        </Link>
        <div class="app-navbar-actions">
          <ThemeSelector />
        </div>
      </nav>

      {loading() ? (
        <div class="loading">
          <div class="loading-spinner" />
          <p>Memuat novel...</p>
        </div>
      ) : error() || !novel() ? (
        <div class="empty-state">
          <h3>{error() || "Novel tidak ditemukan"}</h3>
          <Link to="/" class="back-link">
            <ChevronLeft size={20} />
            Kembali ke Library
          </Link>
        </div>
      ) : (
        <div class="novel-detail">
          <div class="novel-header">
            <div class="novel-cover">
              <BookOpen size={64} />
            </div>

            <div class="novel-info">
              <h1>{novel()!.name}</h1>

              <div class="novel-meta">
                <div class="stat">
                  <FileText size={18} />
                  <span>{novel()!.totalChapters} Bab</span>
                </div>
                <div class="stat">
                  <BookOpen size={18} />
                  <span>{formatWordCount(novel()!.totalWords)} Kata</span>
                </div>
                <div class="stat">
                  <Calendar size={18} />
                  <span>{formatDate(novel()!.createdAt)}</span>
                </div>
              </div>

              {/* Tombol Aksi Mulai Baca */}
              {novel()!.chapters.length > 0 && (
                <div style={{ display: "flex", gap: "0.75rem", "flex-wrap": "wrap", "margin-bottom": "1.5rem" }}>
                  <Link
                    to="/novel/$id/chapter/$chapterId"
                    params={{ id: novel()!._id, chapterId: novel()!.chapters[0]._id }}
                    class="upload-btn"
                    style={{ display: "inline-flex", gap: "0.5rem" }}
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Mulai Baca (Bab 1)</span>
                  </Link>
                  {novel()!.chapters.length > 1 && (
                    <Link
                      to="/novel/$id/chapter/$chapterId"
                      params={{ id: novel()!._id, chapterId: novel()!.chapters[novel()!.chapters.length - 1]._id }}
                      class="chapter-sort-btn"
                      style={{ padding: "0.75rem 1.25rem", "border-radius": "12px" }}
                    >
                      <span>Bab Terakhir (#{novel()!.chapters[novel()!.chapters.length - 1].chap})</span>
                    </Link>
                  )}
                </div>
              )}

              {/* 2 Opsi Pemisahan Bab (Chapter Splitting) */}
              <div class="words-control-box">
                <div class="words-control-title">
                  <Sliders size={18} />
                  <span>Pilih Metode Pemisahan Bab</span>
                </div>

                {/* Tab Selector 2 Opsi */}
                <div class="split-mode-tabs">
                  <button
                    type="button"
                    class={`split-tab-btn ${
                      splitMode() === "fixed_words" ? "active" : ""
                    }`}
                    onClick={() => setSplitMode("fixed_words")}
                  >
                    <FileText size={16} />
                    <span>Fixed Word Count</span>
                  </button>
                  <button
                    type="button"
                    class={`split-tab-btn ${
                      splitMode() === "auto_heading" ? "active" : ""
                    }`}
                    onClick={() => setSplitMode("auto_heading")}
                  >
                    <BookOpen size={16} />
                    <span>Deteksi Heading Otomatis</span>
                  </button>
                </div>

                {/* Konten Opsi 1: Fixed Word Count */}
                {splitMode() === "fixed_words" ? (
                  <div class="split-mode-content">
                    <p class="split-mode-desc">
                      Membagi bab secara rata berdasarkan jumlah kata yang ditentukan tanpa bergantung pada penanda bab.
                    </p>

                    <div class="words-control-inputs">
                      <div class="words-input-wrapper">
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
                          class="words-number-input"
                        />
                        <span class="words-unit">words / chapter</span>
                      </div>

                      <div class="preset-btn-group">
                        {[1000, 2000, 3000, 5000].map((preset) => (
                          <button
                            type="button"
                            class={`preset-chip ${
                              wordsPerChapter() === preset ? "active" : ""
                            }`}
                            onClick={() => setWordsPerChapter(preset)}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleResplit("fixed_words")}
                        disabled={resplitting()}
                        class="resplit-btn"
                      >
                        {resplitting() ? (
                          <>
                            <Loader2 size={16} class="spin" />
                            <span>Memproses pemisahan...</span>
                          </>
                        ) : (
                          <>
                            <FileText size={16} />
                            <span>Split per {wordsPerChapter()} Kata</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Konten Opsi 2: Deteksi Heading Otomatis */
                  <div class="split-mode-content">
                    <p class="split-mode-desc">
                      Otomatis mencari dan memisahkan bab mengikuti judul bab asli (Bab, Chapter, 第X章, dll.) yang ada di dalam teks.
                    </p>

                    <div class="heading-selector-group">
                      <div class="heading-selector-row">
                        <span class="heading-label">Format Penanda:</span>
                        <select
                          value={headingPreset()}
                          onChange={(e) => setHeadingPreset(e.currentTarget.value as any)}
                          class="heading-select"
                        >
                          <option value="auto">Auto-Detect (Semua Bahasa)</option>
                          <option value="chinese">Chinese / 中文 (第X章, 第X回, 序章)</option>
                          <option value="japanese">Japanese / 日本語 (第X話, X話, プロローグ)</option>
                          <option value="korean">Korean / 한국어 (X화, 제X화, 프롤로그)</option>
                          <option value="indonesian">Bahasa Indonesia (Bab, Bagian, Episode)</option>
                          <option value="english">English (Chapter, Ch., Part, Book)</option>
                          <option value="numeric">Angka / Romawi (1., 2., I., II.)</option>
                          <option value="custom">Custom Pattern / Regex...</option>
                        </select>
                      </div>

                      {headingPreset() === "custom" && (
                        <div class="custom-pattern-box">
                          <input
                            type="text"
                            placeholder="e.g. Arc \d+|STAGE \d+|Day \d+"
                            value={customPattern()}
                            onInput={(e) => setCustomPattern(e.currentTarget.value)}
                            class="custom-pattern-input"
                          />
                          <span class="custom-pattern-hint">
                            Masukkan awalan atau pola regex judul bab Anda
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleResplit("auto_heading")}
                        disabled={resplitting()}
                        class="resplit-btn auto-detect-btn"
                      >
                        {resplitting() ? (
                          <>
                            <Loader2 size={16} class="spin" />
                            <span>Mendeteksi judul bab...</span>
                          </>
                        ) : (
                          <>
                            <BookOpen size={16} />
                            <span>Deteksi Heading & Split Otomatis</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {resplitStatus() && (
                  <div class={`resplit-feedback ${resplitStatus()!.type}`}>
                    {resplitStatus()!.type === "success" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span>{resplitStatus()!.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chapters Section with Search and Sorting */}
          <section class="chapters-section">
            <div class="chapters-toolbar">
              <h2 style={{ margin: 0 }}>
                Daftar Bab ({filteredChapters().length}
                {chapterSearch() ? ` dari ${novel()!.chapters.length}` : ""})
              </h2>

              <div style={{ display: "flex", gap: "0.5rem", "flex-wrap": "wrap", flex: 1, "justify-content": "flex-end" }}>
                <div class="chapter-search-box">
                  <Search size={16} class="search-icon" />
                  <input
                    type="text"
                    placeholder="Cari nomor atau judul bab..."
                    value={chapterSearch()}
                    onInput={(e) => setChapterSearch(e.currentTarget.value)}
                    aria-label="Cari bab"
                  />
                  {chapterSearch() && (
                    <XCircle
                      size={16}
                      class="clear-icon"
                      onClick={() => setChapterSearch("")}
                    />
                  )}
                </div>

                <button
                  type="button"
                  class="chapter-sort-btn"
                  onClick={() => setChapterAscending(!chapterAscending())}
                  title={chapterAscending() ? "Urutan: Bab 1 -> Terakhir" : "Urutan: Terakhir -> Bab 1"}
                >
                  <ArrowUpDown size={16} />
                  <span>{chapterAscending() ? "Bab 1 → N" : "Bab N → 1"}</span>
                </button>
              </div>
            </div>

            {filteredChapters().length === 0 ? (
              <div class="empty-state" style={{ padding: "2.5rem 1rem" }}>
                <p>Tidak ada bab yang cocok dengan pencarian "{chapterSearch()}"</p>
              </div>
            ) : (
              <div class="chapters-list">
                {filteredChapters().map((chapter) => (
                  <Link
                    to="/novel/$id/chapter/$chapterId"
                    params={{ id: novel()!._id, chapterId: chapter._id }}
                    class="chapter-item"
                  >
                    <span class="chapter-num">{chapter.chap}</span>
                    <span class="chapter-title">{chapter.name}</span>
                    <span class="chapter-words">
                      {formatWordCount(chapter.wordCount)} kata
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
