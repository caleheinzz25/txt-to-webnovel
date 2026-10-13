import { createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  Minus,
  Plus,
  List,
  Home,
} from "lucide-solid";
import { useTheme } from "../lib/theme";

interface ReaderControlsProps {
  novelId: string;
  novelName: string;
  currentChapter: number;
  totalChapters: number;
  prevChapterId: string | null;
  nextChapterId: string | null;
  onFontSizeChange: (size: number) => void;
  fontSize: number;
  onShowChapterList: () => void;
  onNavigateChapter?: (chapterId: string) => void;
}

export default function ReaderControls(props: ReaderControlsProps) {
  const { theme, cycleTheme, setTheme } = useTheme();
  const [showSettings, setShowSettings] = createSignal(false);
  const [titleExpanded, setTitleExpanded] = createSignal(false);

  const handleFontDecrease = () => {
    if (props.fontSize > 12) {
      props.onFontSizeChange(props.fontSize - 2);
    }
  };

  const handleFontIncrease = () => {
    if (props.fontSize < 32) {
      props.onFontSizeChange(props.fontSize + 2);
    }
  };

  const renderThemeIcon = () => {
    const t = theme();
    if (t === "oled") return <Moon size={20} style={{ fill: "currentColor" }} />;
    if (t === "dark") return <Moon size={20} />;
    if (t === "sepia") return <Coffee size={20} />;
    return <Sun size={20} />;
  };

  return (
    <div class="reader-controls">
      <div class="reader-header">
        <div class="reader-header-left">
          <Link
            to="/novel/$id"
            params={{ id: props.novelId }}
            class="back-btn"
            title="Kembali ke Info Novel"
            aria-label="Kembali"
          >
            <ChevronLeft size={22} />
          </Link>
          <Link
            to="/"
            class="back-btn"
            title="Ke Beranda Library"
            aria-label="Beranda"
          >
            <Home size={18} />
          </Link>
        </div>

        <div
          class={`reader-title ${titleExpanded() ? "expanded" : ""}`}
          onClick={() => setTitleExpanded(!titleExpanded())}
          title={`Klik untuk ${titleExpanded() ? "ciutkan" : "lihat judul lengkap"}: ${props.novelName}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setTitleExpanded(!titleExpanded());
            }
          }}
        >
          <h2>{props.novelName}</h2>
          <span>
            Bab {props.currentChapter} dari {props.totalChapters}
            <small style={{ "margin-left": "0.4rem", opacity: 0.7, "font-size": "0.68rem" }}>
              {titleExpanded() ? "(ciutkan)" : "(klik judul)"}
            </small>
          </span>
        </div>

        <div class="reader-actions">
          <button
            onClick={props.onShowChapterList}
            class="action-btn"
            title="Daftar Bab"
            aria-label="Daftar Bab"
            type="button"
          >
            <List size={20} />
          </button>

          <button
            onClick={cycleTheme}
            class="action-btn"
            title={`Tema saat ini: ${theme()} (Klik untuk ganti)`}
            aria-label="Ganti Tema"
            type="button"
          >
            {renderThemeIcon()}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings())}
            class={`action-btn font-btn ${showSettings() ? "active" : ""}`}
            title="Pengaturan Tampilan"
            aria-label="Pengaturan Tampilan"
            type="button"
          >
            Aa
          </button>
        </div>
      </div>

      {showSettings() && (
        <div class="font-settings" style={{ "flex-wrap": "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", "align-items": "center", gap: "0.5rem" }}>
            <span style={{ "font-size": "0.85rem", color: "var(--text-secondary)" }}>
              Ukuran Font:
            </span>
            <div class="font-size-controls">
              <button
                type="button"
                onClick={handleFontDecrease}
                disabled={props.fontSize <= 12}
                aria-label="Perkecil font"
              >
                <Minus size={16} />
              </button>
              <span style={{ "min-width": "35px", "text-align": "center" }}>{props.fontSize}px</span>
              <button
                type="button"
                onClick={handleFontIncrease}
                disabled={props.fontSize >= 32}
                aria-label="Perbesar font"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", "align-items": "center", gap: "0.4rem" }}>
            <span style={{ "font-size": "0.85rem", color: "var(--text-secondary)" }}>
              Tema:
            </span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["oled", "dark", "sepia", "light"] as const).map((t) => (
                <button
                  type="button"
                  onClick={() => setTheme(t)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    "border-radius": "6px",
                    "font-size": "0.75rem",
                    "font-weight": 600,
                    "text-transform": "capitalize",
                    background: theme() === t ? "var(--accent-primary)" : "var(--bg-secondary)",
                    color: theme() === t ? "white" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                  }}
                >
                  {t === "oled" ? "OLED" : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick top previous/next bar */}
      <div class="reader-nav">
        {props.prevChapterId ? (
          <a
            href={`/novel/${props.novelId}/chapter/${props.prevChapterId}`}
            class="nav-btn prev"
            aria-label="Bab Sebelumnya"
            onClick={(e) => {
              if (props.onNavigateChapter) {
                e.preventDefault();
                props.onNavigateChapter(props.prevChapterId!);
              }
            }}
          >
            <ChevronLeft size={18} />
            <span>Sebelumnya</span>
          </a>
        ) : (
          <div class="nav-btn prev disabled" aria-disabled="true">
            <ChevronLeft size={18} />
            <span>Sebelumnya</span>
          </div>
        )}

        <button
          type="button"
          onClick={props.onShowChapterList}
          class="nav-btn"
          style={{ "font-size": "0.825rem", padding: "0.4rem 0.75rem" }}
        >
          <List size={16} />
          <span>Bab {props.currentChapter} / {props.totalChapters}</span>
        </button>

        {props.nextChapterId ? (
          <a
            href={`/novel/${props.novelId}/chapter/${props.nextChapterId}`}
            class="nav-btn next"
            aria-label="Bab Selanjutnya"
            onClick={(e) => {
              if (props.onNavigateChapter) {
                e.preventDefault();
                props.onNavigateChapter(props.nextChapterId!);
              }
            }}
          >
            <span>Selanjutnya</span>
            <ChevronRight size={18} />
          </a>
        ) : (
          <div class="nav-btn next disabled" aria-disabled="true">
            <span>Selanjutnya</span>
            <ChevronRight size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
