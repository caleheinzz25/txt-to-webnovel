# txt-to-webnovel — Project Architecture & Developer Notes

> **Generated:** October 2026  
> **Status:** Fully functional full-stack web application for converting `.txt` novel files into interactive web novel reader platforms.

---

## 1. Overview & Core Purpose

`txt-to-webnovel` is a full-stack web application designed for reading, parsing, and managing large text novel files (including CJK web novels such as Chinese xianxia/wuxia, Japanese light novels, Korean web novels, English, and Indonesian books). It parses raw text, detects encodings, chunks contents into chapters, stores them in MongoDB, and serves them via an interactive, optimized reader interface.

---

## 2. Technology Stack

| Layer | Technology | Details / Version |
| :--- | :--- | :--- |
| **Framework** | TanStack Solid Start | `1.169.1` (SSR + Fullstack) |
| **UI Library** | Solid.js | `^1.9.12` (Reactive signal-based UI) |
| **Routing** | TanStack Solid Router | `1.170.41` (File-based routing) |
| **Data Fetching** | TanStack Solid Query | `5.104.2` |
| **Server Engine** | Nitro | `3.0.260610-beta` via Vite plugin |
| **Bundler & Dev Server**| Vite | `^8.0.0` with `vite-plugin-solid` |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/vite` (`^4.1.18`), CSS variables |
| **Database** | MongoDB | Native driver `mongodb` (`^7.7.0`) |
| **Auth** | Better Auth | `^1.5.3` with TanStack Start cookie plugin |
| **Encoding & Text** | `iconv-lite`, `jschardet` | Multi-script CJK & BOM decoder |
| **Icons** | Lucide Solid | `lucide-solid` (`^1.56.0`) |
| **Linter / Formatter** | Biome | `@biomejs/biome` (`2.4.5`) |
| **Runtime** | Bun / Node.js | Developed with Bun, runnable with Node/Bun |

---

## 3. Directory Structure

```
txt-to-webnovel/
├── AGENTS.md                  # Agentic workflow rules (Intent skills check)
├── biome.json                 # Biome configuration
├── bun.lock                   # Lockfile
├── package.json               # Package manifests and scripts
├── tsconfig.json              # TypeScript configuration
├── tsr.config.json            # TanStack Router configuration
├── ui.config.json             # SolidUI CLI configuration
├── vite.config.ts             # Vite plugins (Solid, TanStack, Nitro, Tailwind)
├── .env.example               # Template for environment variables
├── .env.local                 # Local environment overrides
├── src/
│   ├── env.ts                 # Type-safe runtime environment validation (@t3-oss/env-core)
│   ├── router.tsx             # TanStack Router instance & context definition
│   ├── routeTree.gen.ts       # Auto-generated route tree
│   ├── styles.css             # Main stylesheet (Tailwind v4, Theme variables, Reader styles)
│   ├── components/
│   │   ├── ChapterList.tsx    # Slide-over chapter drawer with search and ordering
│   │   ├── FileUpload.tsx     # Drag-and-drop TXT upload with splitting/encoding controls
│   │   ├── NovelCard.tsx      # Library card item with stats and deletion
│   │   ├── ReaderControls.tsx # Top navigation, font size, theme switch, chapter jumps
│   │   ├── SearchBar.tsx      # Debounced library search and multi-field sorting
│   │   └── ThemeSelector.tsx  # Theme pill switch (OLED, Dark, Sepia, Light)
│   ├── integrations/
│   │   ├── better-auth/       # Better Auth header & user state integration
│   │   └── tanstack-query/    # TanStack Query Client provider
│   ├── lib/
│   │   ├── auth.ts            # Better Auth server configuration
│   │   ├── auth-client.ts     # Better Auth client instance
│   │   ├── encoding.ts        # Robust character encoding detection & BOM handling
│   │   ├── mongodb.ts         # MongoDB MongoClient singleton with HMR support
│   │   ├── textProcessor.ts   # Multi-lingual chapter regex patterns & word count
│   │   ├── theme.tsx          # Solid Context for reading theme state
│   │   ├── utils.ts           # Styling utilities (`clsx` + `tailwind-merge`)
│   │   └── models/
│   │       ├── chapters.ts    # Chapter MongoDB queries, batch insertion & navigation
│   │       └── novels.ts      # Novel MongoDB CRUD queries
│   └── routes/
│       ├── __root.tsx         # Root layout with ThemeProvider, fonts, hydration script
│       ├── index.tsx          # Library home page (Upload & grid)
│       ├── novel.$id.index.tsx# Novel detail page (stats, re-split modal, chapter list)
│       ├── novel.$id.chapter.$chapterId.tsx # Reader view (pre-fetching, instant nav)
│       └── api/
│           ├── auth/$.ts      # Better Auth API catch-all handler
│           ├── chapters.ts    # GET chapters by novel ID
│           ├── chapters.$id.ts# GET single chapter with adjacent chapter links & cached metadata
│           ├── novels.ts      # GET novels list with search and sorting
│           ├── novels.$id.ts  # GET single novel & DELETE novel + cascade chapters
│           ├── novels.$id.resplit.ts # Re-split existing novel chapters
│           └── upload.ts      # File upload, encoding decode, splitting, and batch insert
```

---

## 4. Key Subsystems & Architecture

### 4.1 Database Layer (`src/lib/mongodb.ts` & `src/lib/models/`)
- **Connection Handling:** Uses a shared `MongoClient` stored on `global._mongoClientPromise` during development to avoid connection exhaustion during Vite Hot Module Reloading (HMR).
- **Target Database:** `"noveldb"`.
- **Collections & Indexes:**
  - `novels`: Stores novel metadata (`name`, `totalChapters`, `totalWords`, `createdAt`, `updatedAt`).
  - `chapters`: Stores chapter documents (`novelId`, `name`, `chap`, `content`, `wordCount`). Automatically ensures compound index `{ novelId: 1, chap: 1 }` on first query.
- **Batch Processing:** `createManyChapters` writes in batches of 200 documents (`insertMany({ ordered: false })`) to optimize database payload limits when importing novels with thousands of chapters.

### 4.2 Encoding Detection (`src/lib/encoding.ts`)
Web novels frequently arrive in diverse legacy East Asian encodings. The decoding pipeline applies a prioritized fallback strategy:
1. **Explicit Encoding:** If user specifies an encoding (e.g. GBK, Big5, Shift-JIS), attempts `iconv-lite` decoding first.
2. **Byte Order Marks (BOM):** Inspects the initial bytes:
   - `0xEF, 0xBB, 0xBF` -> UTF-8
   - `0xFF, 0xFE` -> UTF-16LE
   - `0xFE, 0xFF` -> UTF-16BE
3. **Strict UTF-8 Verification:** Decodes using `TextDecoder("utf-8", { fatal: true })`.
4. **Statistical Detection via `jschardet`:** Samples up to 64KB for speed; maps detected Chinese formats to `gb18030` (superset of GBK and GB2312).
5. **Fallback:** Defaults to `gb18030`.

### 4.3 Text Splitting & Heading Detection (`src/lib/textProcessor.ts`)
- **Word Counting (`countWords`):** Accurately calculates length by combining CJK character counts (Hanzi, Japanese Hiragana/Katakana, Korean Hangul) with whitespace-delimited Latin words.
- **Heading Presets:**
  - `chinese`: `第X[章回节卷集部篇折]`, `序章`, `终章`, `番外`, etc.
  - `japanese`: `第X[話章幕節巻篇]`, `プロローグ`, `エピローグ`, etc.
  - `korean`: `[제]X[화장편부회]`, `프롤로그`, `에필로그`, etc.
  - `indonesian`: `Bab X`, `Bagian X`, `Episode X`, `Prolog`, `Epilog`.
  - `english`: `Chapter X`, `Part X`, `Book X`, `Prologue`, `Epilogue`, etc.
  - `numeric`: Numbered lines (`1.`, `2.`, `I.`, `II.`).
  - `custom`: Regex provided by the user.
  - `auto`: Broad multi-language regex union.
- **Fixed Word Fallback:** If fewer than 2 headings match or if forced, splits text into chunks of target word length (default 2,000 words) while keeping paragraphs intact.
- **Re-splitting Feature (`/api/novels/:id/resplit`):** Concatenates all existing chapter contents in the database and re-runs the splitting algorithm with new parameters without requiring re-uploading the file.

### 4.4 Reader Performance & UX (`src/routes/novel.$id.chapter.$chapterId.tsx`)
- **Instant Client-Side Navigation:** Uses `window.history.pushState` and in-memory signal updates (`setCurrentChapterId`) to switch chapters without trigger full-page DOM unmount/reload.
- **Multi-Level Lookahead Prefetching (`prefetchChaptersAhead`):**
  - Immediately requests Chapter $N-1$ and Chapter $N+1$.
  - Once Chapter $N+1$ resolves, asynchronously buffers Chapter $N+2$ and Chapter $N+3$.
  - Reading sequential chapters becomes instantaneous from in-memory cache.
- **Reading Progress Bar:** Real-time top progress indicator tracking scroll position against viewport and document height.
- **Themes Supported:**
  - `oled`: Pure `#000000` black background for OLED screens and low power consumption.
  - `dark`: Deep navy/slate (`#0d1117`).
  - `sepia`: Warm paper tone (`#fbf0d9` / `#433422`).
  - `light`: Crisp daytime paper white (`#ffffff`).
- **Typography Controls:** Dynamic font scaling (12px to 32px) saved in browser `localStorage`.

---

## 5. Development & Operations Guide

### 5.1 Environment Variables
Configure `.env.local` based on `.env.example`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MAX_FILE_SIZE=52428800 # 50 MB in bytes (optional)
```

### 5.2 Common Commands
- **Install dependencies:**
  ```bash
  bun install
  ```
- **Start development server:**
  ```bash
  bun run dev # Vite on port 3000
  ```
- **Build production bundle:**
  ```bash
  bun run build
  ```
- **Run production server:**
  ```bash
  node .output/server/index.mjs
  # OR
  bun .output/server/index.mjs
  ```
- **Generate routes:**
  ```bash
  bun run generate-routes
  ```

---

## 6. Notable Caveats & Future Improvements

1. **Biome Configuration:**
   - `biome.json` is configured against schema `1.9.4` with deprecated keys (`ignore`, `include`, `organizeImports`), whereas `@biomejs/biome` `2.4.5` is installed. Running `bunx @biomejs/biome migrate` or updating keys to `includes` will restore `bun run check`.
2. **Intent Dependency:**
   - Per `AGENTS.md`, the workspace checks for `@tanstack/intent`. It is currently not installed in `node_modules` / devDependencies.
3. **Authentication Gaps:**
   - `better-auth` is configured in `src/lib/auth.ts`, but database persistence for sessions/users is not connected to a relational DB (Better Auth typically uses SQLite/PostgreSQL/MySQL or MongoDB adapter plugin). Novel upload and reading routes currently operate in an open, unauthenticated mode.
4. **Offline / PWA Storage:**
   - Large novels currently store all chapters remotely in MongoDB. Future enhancements could implement IndexedDB caching for offline reading on mobile browsers.
