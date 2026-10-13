import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount } from 'solid-js'
import { BookOpen } from 'lucide-solid'
import FileUpload from '../components/FileUpload'
import NovelCard from '../components/NovelCard'
import SearchBar from '../components/SearchBar'
import ThemeSelector from '../components/ThemeSelector'

export const Route = createFileRoute('/')({
  component: HomePage,
})

interface Novel {
  _id: string
  name: string
  totalChapters: number
  totalWords: number
  createdAt: string
}

function HomePage() {
  const [novels, setNovels] = createSignal<Novel[]>([])
  const [loading, setLoading] = createSignal(true)
  const [search, setSearch] = createSignal("")
  const [sortBy, setSortBy] = createSignal("createdAt")
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">("desc")

  const fetchNovels = async () => {
    try {
      const params = new URLSearchParams()
      if (search()) params.set("search", search())
      params.set("sortBy", sortBy())
      params.set("sortOrder", sortOrder())

      const response = await fetch(`/api/novels?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setNovels(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch novels:", error)
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    fetchNovels()
  })

  const handleSearch = (query: string) => {
    setSearch(query)
    fetchNovels()
  }

  const handleSort = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    fetchNovels()
  }

  const handleUploadSuccess = () => {
    fetchNovels()
  }

  const handleDelete = (id: string) => {
    setNovels((prev) => prev.filter((novel) => novel._id !== id))
  }

  return (
    <main class="main-container">
      <nav class="app-navbar" style={{ "border-radius": "16px", "margin-bottom": "2rem" }}>
        <div class="app-navbar-brand">
          <BookOpen class="brand-icon" size={24} />
          <span>NovelReader</span>
        </div>
        <div class="app-navbar-actions">
          <ThemeSelector />
        </div>
      </nav>

      <header class="header">
        <h1>NovelReader</h1>
        <p>
          Upload novel TXT dan nikmati membaca dengan tampilan interaktif & nyaman di web dan mobile
        </p>
      </header>

      <section>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
      </section>

      <section class="novels-section">
        <h2>Your Library</h2>

        <SearchBar onSearch={handleSearch} onSort={handleSort} />

        {loading() ? (
          <div class="loading">
            <div class="loading-spinner" />
            <p>Loading novels...</p>
          </div>
        ) : novels().length === 0 ? (
          <div class="empty-state">
            <div class="empty-state-icon">
              <BookOpen size={64} />
            </div>
            <h3>No novels yet</h3>
            <p>Upload a TXT file to get started</p>
          </div>
        ) : (
          <div class="novels-grid">
            {novels().map((novel) => (
              <NovelCard
                id={novel._id}
                name={novel.name}
                totalChapters={novel.totalChapters}
                totalWords={novel.totalWords}
                createdAt={novel.createdAt}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
