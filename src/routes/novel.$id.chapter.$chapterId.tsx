import { createFileRoute, Link } from '@tanstack/solid-router'
import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import {
  ChevronLeft,
  ChevronRight,
  List,
  ArrowUp,
} from 'lucide-solid'
import ReaderControls from '../components/ReaderControls'
import ChapterList from '../components/ChapterList'

export const Route = createFileRoute('/novel/$id/chapter/$chapterId')({
  component: ChapterReaderPage,
})

interface Chapter {
  _id: string
  novelId: string
  novelName: string
  totalChapters: number
  name: string
  chap: number
  content: string
  wordCount: number
  navigation: {
    prevId: string | null
    nextId: string | null
  }
}

interface ChapterListItem {
  _id: string
  name: string
  chap: number
  wordCount: number
}

// Client-side cache to make chapter navigation instant
const chapterCache = new Map<string, Chapter>()
const pendingFetches = new Map<string, Promise<Chapter | null>>()

async function fetchChapterData(id: string): Promise<Chapter | null> {
  if (!id) return null
  if (chapterCache.has(id)) return chapterCache.get(id)!
  if (pendingFetches.has(id)) return pendingFetches.get(id)!

  const promise = (async () => {
    try {
      const res = await fetch(`/api/chapters/${id}`)
      const data = await res.json()
      if (data.success && data.data) {
        chapterCache.set(id, data.data)
        return data.data as Chapter
      }
      return null
    } catch {
      return null
    } finally {
      pendingFetches.delete(id)
    }
  })()

  pendingFetches.set(id, promise)
  return promise
}

// Prefetch multiple chapters ahead so rapid clicking is completely buffered
async function prefetchChaptersAhead(startChapter: Chapter) {
  // 1. Fetch immediate next and previous
  const next1Promise = startChapter.navigation.nextId
    ? fetchChapterData(startChapter.navigation.nextId)
    : Promise.resolve(null)

  if (startChapter.navigation.prevId) {
    fetchChapterData(startChapter.navigation.prevId)
  }

  // 2. Once next1 arrives, immediately prefetch next2 (+2 chapters ahead)
  const next1 = await next1Promise
  if (next1 && next1.navigation.nextId) {
    const next2Promise = fetchChapterData(next1.navigation.nextId)
    const next2 = await next2Promise
    if (next2 && next2.navigation.nextId) {
      // Buffer +3 chapters ahead
      fetchChapterData(next2.navigation.nextId)
    }
  }
}

function ChapterReaderPage() {
  const params = Route.useParams()
  const novelId = () => params().id
  const routeChapterId = () => params().chapterId

  const [currentChapterId, setCurrentChapterId] = createSignal(routeChapterId())
  const [chapter, setChapter] = createSignal<Chapter | null>(chapterCache.get(routeChapterId()) || null)
  const [chapters, setChapters] = createSignal<ChapterListItem[]>([])
  const [loading, setLoading] = createSignal(!chapterCache.has(routeChapterId()))
  const [error, setError] = createSignal<string | null>(null)
  const [fontSize, setFontSize] = createSignal(18)
  const [showChapterList, setShowChapterList] = createSignal(false)
  const [scrollProgress, setScrollProgress] = createSignal(0)

  // Sync state if URL param changes (e.g. browser back/forward)
  createEffect(() => {
    const pId = routeChapterId()
    if (pId && pId !== currentChapterId()) {
      setCurrentChapterId(pId)
    }
  })

  onMount(() => {
    // Load saved font size
    const savedFontSize = localStorage.getItem('readerFontSize')
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10))
    }

    // Scroll listener for reading progress
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        const progress = Math.min(
          100,
          Math.max(0, (window.scrollY / totalHeight) * 100)
        )
        setScrollProgress(progress)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    onCleanup(() => {
      window.removeEventListener('scroll', handleScroll)
    })
  })

  // Listen to popstate for browser back/forward
  onMount(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/chapter\/([^/]+)/)
      if (match && match[1]) {
        setCurrentChapterId(match[1])
      }
    }
    window.addEventListener('popstate', handlePopState)
    onCleanup(() => {
      window.removeEventListener('popstate', handlePopState)
    })
  })

  // Fetch full chapter list for drawer once
  onMount(async () => {
    try {
      const response = await fetch(`/api/chapters?novelId=${novelId()}`)
      const data = await response.json()
      if (data.success) {
        setChapters(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load chapters:', err)
    }
  })

  // Main chapter loader effect whenever currentChapterId changes
  createEffect(() => {
    const cId = currentChapterId()
    if (!cId) return

    let isCancelled = false

    const loadChapter = async () => {
      if (chapterCache.has(cId)) {
        const cached = chapterCache.get(cId)!
        setChapter(cached)
        setLoading(false)
        setError(null)
        prefetchChaptersAhead(cached)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchChapterData(cId)
        if (isCancelled) return

        if (data) {
          setChapter(data)
          prefetchChaptersAhead(data)
        } else {
          setError('Chapter not found')
        }
      } catch {
        if (!isCancelled) {
          setError('Failed to load chapter')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadChapter()

    onCleanup(() => {
      isCancelled = true
    })
  })

  // Navigate to a new chapter instantly in-memory without full reload
  const navigateToChapter = (targetId: string) => {
    if (!targetId || targetId === currentChapterId()) return

    window.history.pushState(null, '', `/novel/${novelId()}/chapter/${targetId}`)
    setCurrentChapterId(targetId)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    setScrollProgress(0)

    if (chapterCache.has(targetId)) {
      const cached = chapterCache.get(targetId)!
      setChapter(cached)
      setLoading(false)
      setError(null)
      prefetchChaptersAhead(cached)
    } else {
      setLoading(true)
    }
  }

  const handleFontSizeChange = (size: number) => {
    setFontSize(size)
    localStorage.setItem('readerFontSize', size.toString())
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Format content into readable paragraphs preserving line breaks and indentation
  const formatContent = (content: string) => {
    if (!content) return []
    return content
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
  }

  return (
    <div class="reader-container">
      {/* Real-time reading progress bar at the very top */}
      <div
        class="reader-progress-bar"
        style={{ width: `${scrollProgress()}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress())}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {loading() ? (
        <div class="loading" style={{ "min-height": "100vh" }}>
          <div class="loading-spinner" />
          <p>Loading chapter...</p>
        </div>
      ) : error() || !chapter() ? (
        <div class="loading" style={{ "min-height": "100vh" }}>
          <h3>{error() || "Chapter not found"}</h3>
          <Link
            to="/novel/$id"
            params={{ id: novelId() }}
            class="back-btn"
            style={{ "margin-top": "1rem", display: "inline-flex" }}
          >
            Kembali ke Daftar Bab
          </Link>
        </div>
      ) : (
        <>
          <ReaderControls
            novelId={novelId()}
            novelName={chapter()!.novelName}
            currentChapter={chapter()!.chap}
            totalChapters={chapter()!.totalChapters}
            prevChapterId={chapter()!.navigation.prevId}
            nextChapterId={chapter()!.navigation.nextId}
            onFontSizeChange={handleFontSizeChange}
            fontSize={fontSize()}
            onShowChapterList={() => setShowChapterList(true)}
            onNavigateChapter={navigateToChapter}
          />

          <article
            class="reader-content"
            style={{
              "font-size": `${fontSize()}px`,
              "line-height": fontSize() > 20 ? 1.8 : 1.9,
            }}
          >
            <header style={{ "margin-bottom": "2rem", "text-align": "center" }}>
              <h1
                style={{
                  "font-size": "1.4em",
                  "font-weight": 700,
                  "margin-bottom": "0.5rem",
                  "line-height": 1.3,
                  "word-break": "break-word",
                  "overflow-wrap": "anywhere",
                }}
              >
                {chapter()!.name}
              </h1>
              <div
                style={{
                  "font-size": "0.8em",
                  color: "var(--text-muted)",
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "center",
                  gap: "0.75rem",
                }}
              >
                <span>Bab {chapter()!.chap}</span>
                <span>•</span>
                <span>{chapter()!.wordCount.toLocaleString()} kata</span>
              </div>
            </header>

            {formatContent(chapter()!.content).map((paragraph) => (
              <p>{paragraph}</p>
            ))}
          </article>

          {/* Interactive Bottom Navigation for Readers */}
          <nav class="reader-bottom-nav" aria-label="Navigasi bab selesai">
            <div class="reader-bottom-progress">
              <span>
                Bab {chapter()!.chap} dari {chapter()!.totalChapters}
              </span>
              <span>Progres Baca: {Math.round(scrollProgress())}%</span>
            </div>

            <div class="reader-bottom-actions">
              {chapter()!.navigation.prevId ? (
                <a
                  href={`/novel/${novelId()}/chapter/${chapter()!.navigation.prevId}`}
                  class="bottom-nav-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    navigateToChapter(chapter()!.navigation.prevId!)
                  }}
                >
                  <ChevronLeft size={20} />
                  <span>Sebelumnya</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  class="bottom-nav-btn disabled"
                >
                  <ChevronLeft size={20} />
                  <span>Sebelumnya</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowChapterList(true)}
                class="bottom-nav-btn"
                title="Buka Daftar Bab"
                aria-label="Buka Daftar Bab"
              >
                <List size={20} />
                <span>Daftar Bab</span>
              </button>

              {chapter()!.navigation.nextId ? (
                <a
                  href={`/novel/${novelId()}/chapter/${chapter()!.navigation.nextId}`}
                  class="bottom-nav-btn primary"
                  onClick={(e) => {
                    e.preventDefault()
                    navigateToChapter(chapter()!.navigation.nextId!)
                  }}
                >
                  <span>Selanjutnya</span>
                  <ChevronRight size={20} />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  class="bottom-nav-btn disabled"
                >
                  <span>Tamat</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={scrollToTop}
              class="back-to-top-btn"
              aria-label="Kembali ke atas"
            >
              <ArrowUp size={16} />
              <span>Kembali ke Atas</span>
            </button>
          </nav>

          {showChapterList() && (
            <ChapterList
              novelId={novelId()}
              chapters={chapters()}
              currentChapterId={currentChapterId()}
              onClose={() => setShowChapterList(false)}
              onSelectChapter={navigateToChapter}
            />
          )}
        </>
      )}
    </div>
  )
}
