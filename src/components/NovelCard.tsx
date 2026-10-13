import { Link } from '@tanstack/solid-router'
import { BookOpen, Trash2, Calendar, FileText } from 'lucide-solid'

interface NovelCardProps {
  id: string
  name: string
  totalChapters: number
  totalWords: number
  createdAt: string
  onDelete?: (id: string) => void
}

export default function NovelCard(props: NovelCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatWordCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  const handleDelete = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete "${props.name}"?`)) return

    try {
      const response = await fetch(`/api/novels/${props.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        props.onDelete?.(props.id)
      }
    } catch (error) {
      console.error('Failed to delete novel:', error)
    }
  }

  return (
    <div class="novel-card">
      <Link
        to="/novel/$id"
        params={{ id: props.id }}
        class="novel-card-link"
      >
        <div class="novel-card-cover">
          <BookOpen size={48} />
        </div>

        <div class="novel-card-content">
          <h3 class="novel-card-title">{props.name}</h3>

          <div class="novel-card-stats">
            <div class="stat">
              <FileText size={16} />
              <span>{props.totalChapters} Chapters</span>
            </div>
            <div class="stat">
              <BookOpen size={16} />
              <span>{formatWordCount(props.totalWords)} Words</span>
            </div>
          </div>

          <div class="novel-card-date">
            <Calendar size={14} />
            <span>{formatDate(props.createdAt)}</span>
          </div>
        </div>
      </Link>

      <button
        onClick={handleDelete}
        class="novel-card-delete"
        title="Delete novel"
        type="button"
      >
        <Trash2 size={18} />
      </button>
    </div>
  )
}
