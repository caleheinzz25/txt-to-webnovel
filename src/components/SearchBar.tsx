import { createSignal } from 'solid-js'
import { Search, ArrowUpDown, X } from 'lucide-solid'

interface SearchBarProps {
  onSearch: (query: string) => void
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export default function SearchBar(props: SearchBarProps) {
  const [query, setQuery] = createSignal('')
  const [sortBy, setSortBy] = createSignal('createdAt')
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc')

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      props.onSearch(value)
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    if (timeoutId) clearTimeout(timeoutId)
    props.onSearch('')
  }

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy)
    props.onSort(newSortBy, sortOrder())
  }

  const toggleSortOrder = () => {
    const newOrder = sortOrder() === 'asc' ? 'desc' : 'asc'
    setSortOrder(newOrder)
    props.onSort(sortBy(), newOrder)
  }

  return (
    <div class="search-bar">
      <div class="search-input-wrapper">
        <Search size={20} class="search-icon" />
        <input
          type="text"
          placeholder="Search novels..."
          value={query()}
          onInput={(e) => handleQueryChange(e.currentTarget.value)}
          class="search-input"
        />
        {query() && (
          <button onClick={handleClear} class="clear-btn" type="button">
            <X size={18} />
          </button>
        )}
      </div>

      <div class="sort-controls">
        <select
          value={sortBy()}
          onChange={(e) => handleSortChange(e.currentTarget.value)}
          class="sort-select"
        >
          <option value="createdAt">Date</option>
          <option value="name">Title</option>
          <option value="totalChapters">Chapters</option>
          <option value="totalWords">Words</option>
        </select>

        <button
          onClick={toggleSortOrder}
          class="sort-order-btn"
          type="button"
          title={sortOrder() === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown size={18} />
        </button>
      </div>
    </div>
  )
}
