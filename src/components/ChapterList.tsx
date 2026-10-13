import { createSignal, createMemo, onMount } from "solid-js";
import { X, BookOpen, Search, ArrowUpDown, XCircle } from "lucide-solid";

interface Chapter {
  _id: string;
  name: string;
  chap: number;
  wordCount: number;
}

interface ChapterListProps {
  novelId: string;
  chapters: Chapter[];
  currentChapterId: string;
  onClose: () => void;
  onSelectChapter?: (chapterId: string) => void;
}

export default function ChapterList(props: ChapterListProps) {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [ascending, setAscending] = createSignal(true);
  let activeItemRef: HTMLAnchorElement | undefined;

  const formatWordCount = (count: number) => {
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };

  const filteredChapters = createMemo(() => {
    let list = props.chapters || [];
    const q = searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.chap.toString().includes(q)
      );
    }

    if (!ascending()) {
      list = [...list].reverse();
    }

    return list;
  });

  // Auto-scroll to active chapter once loaded
  onMount(() => {
    if (activeItemRef) {
      activeItemRef.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  });

  return (
    <div class="chapter-list-overlay" onClick={props.onClose}>
      <div class="chapter-list-panel" onClick={(e) => e.stopPropagation()}>
        <div class="chapter-list-header">
          <h3>
            <BookOpen size={20} />
            <span>Daftar Bab ({props.chapters?.length || 0})</span>
          </h3>
          <button
            onClick={props.onClose}
            class="close-btn"
            type="button"
            aria-label="Tutup daftar bab"
          >
            <X size={22} />
          </button>
        </div>

        {/* Quick Search & Sort in Drawer */}
        <div class="drawer-search-wrapper">
          <div style={{ position: "relative", flex: 1, display: "flex", "align-items": "center" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "0.6rem",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Cari nomor atau judul bab..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="drawer-search-input"
              style={{ "padding-left": "2rem", "padding-right": searchQuery() ? "2rem" : "0.75rem" }}
            />
            {searchQuery() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  color: "var(--text-muted)",
                  padding: "0.2rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <XCircle size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            class="drawer-sort-btn"
            onClick={() => setAscending(!ascending())}
            title={ascending() ? "Urutan: 1 -> Terakhir" : "Urutan: Terakhir -> 1"}
            aria-label="Ubah urutan bab"
          >
            <ArrowUpDown size={16} />
          </button>
        </div>

        <div class="chapter-list-content">
          {filteredChapters().length === 0 ? (
            <div style={{ padding: "2rem 1rem", "text-align": "center", color: "var(--text-muted)" }}>
              Tidak ada bab yang cocok dengan "{searchQuery()}"
            </div>
          ) : (
            filteredChapters().map((chapter) => {
              const isActive = chapter._id === props.currentChapterId;
              return (
                <a
                  ref={isActive ? (el) => (activeItemRef = el) : undefined}
                  href={`/novel/${props.novelId}/chapter/${chapter._id}`}
                  class={`chapter-list-item ${isActive ? "active" : ""}`}
                  onClick={(e) => {
                    props.onClose();
                    if (props.onSelectChapter && !isActive) {
                      e.preventDefault();
                      props.onSelectChapter(chapter._id);
                    }
                  }}
                >
                  <span class="chapter-number">{chapter.chap}</span>
                  <span class="chapter-name">{chapter.name}</span>
                  <span class="chapter-words">
                    {formatWordCount(chapter.wordCount)} words
                  </span>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
