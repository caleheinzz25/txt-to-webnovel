import { useTheme, type Theme } from '../lib/theme'
import { Sun, Moon, Coffee } from 'lucide-solid'

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'oled', label: 'OLED', icon: Moon },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'sepia', label: 'Sepia', icon: Coffee },
    { id: 'light', label: 'Light', icon: Sun },
  ]

  return (
    <div class="theme-pill-selector" role="group" aria-label="Theme selector">
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = () => theme() === t.id
        return (
          <button
            type="button"
            class={`theme-pill-btn ${isActive() ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
            title={`Switch to ${t.label} theme`}
            aria-label={`${t.label} theme`}
          >
            <Icon size={16} />
          </button>
        )
      })}
    </div>
  )
}
