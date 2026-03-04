# SmartNotes — Source Architecture & Development Plan

> This document covers everything inside `src/`: what exists today, how the pieces fit together, the backend RAG architecture that will be integrated, and a stepwise roadmap to get there.

---

## Table of contents

1. [Design principles](#design-principles)
2. [Current source layout](#current-source-layout)
3. [Frontend architecture (Electron + TipTap)](#frontend-architecture)
4. [Electron main process modules](#electron-main-process-modules)
5. [Renderer component tree](#renderer-component-tree)
6. [Explainable RAG backend architecture](#explainable-rag-backend-architecture)
7. [Pipeline stages in detail](#pipeline-stages-in-detail)
8. [Integration strategy: backend ↔ desktop](#integration-strategy)
9. [Stepwise development plan](#stepwise-development-plan)
10. [Contributing to src/](#contributing-to-src)

---

## Design principles

Every decision in `src/` follows these rules:

| Principle | What it means in code |
|---|---|
| **Offline by default** | Zero network calls unless the user explicitly opts in. No telemetry, no cloud sync, no auto-update pings. |
| **Privacy-first** | Notes live as `.md` files on the user's disk. The graph + paginated chunk store and metadata index are local. Nothing leaves the machine. |
| **Modular / swappable** | The AI layer is a plugin — the app works perfectly without it. Models, storage backends, retrieval strategies, and even the editor can be swapped without rewriting the shell. |
| **No heavy server** | No always-on backend process. Local services spawn on demand and shut down when idle. This is a desktop app, not SaaS. |
| **Scalable to large collections** | Design for 10k–100k notes from day one: incremental indexing, debounced watchers, background workers, lazy UI rendering. |

---

## Current source layout

```text
src/
├── backend/                          # (empty — RAG pipeline will land here)
│
└── frontend/
    ├── package.json                  # Electron + Vite + React + TipTap + Tailwind
    ├── tsconfig.json                 # Strict TypeScript
    ├── vite.config.js                # Vite → renderer, @ path alias
    ├── tailwind.config.js            # Dark neon theme tokens
    ├── postcss.config.js
    │
    ├── electron/                     # ── Main process (Node.js / CJS) ──
    │   ├── main.cjs                  # App lifecycle, window, IPC router
    │   ├── preload.cjs               # contextBridge → window.smartNotes API
    │   ├── notesStore.cjs            # File-system CRUD (flat + recursive tree)
    │   ├── notesWatcher.cjs          # chokidar-based folder watcher (**/*.md)
    │   └── settings.cjs              # JSON settings persistence (userData)
    │
    └── renderer/                     # ── Renderer process (Vite + React) ──
        ├── index.html                # Shell (dark class, font preloads)
        └── src/
            ├── main.tsx              # React root mount
            ├── App.tsx               # Layout: Sidebar + Toolbar + NoteEditor
            │
            ├── components/
            │   ├── Sidebar.tsx       # Recursive folder tree, file selection
            │   ├── NoteEditor.tsx    # TipTap editor wrapper, empty state
            │   └── Toolbar.tsx       # Formatting bar (headings, bold, lists…)
            │
            ├── hooks/
            │   ├── useNotes.ts       # All notes/folder state + IPC bridge
            │   └── useMarkdownEditor.ts  # TipTap + markdown serialization
            │
            ├── types/
            │   └── global.d.ts       # window.smartNotes typed API contract
            │
            └── styles/
                └── index.css         # Tailwind directives + ProseMirror theme
```

---

## Frontend architecture

### High-level data flow

```text
┌─────────────────────────── Electron ───────────────────────────────┐
│                                                                     │
│  Main process                          Renderer process             │
│  ─────────────                         ──────────────────           │
│  notesStore.cjs ──── IPC ────────────► useNotes.ts                  │
│  notesWatcher.cjs ── push event ─────► onNotesChanged → refresh     │
│  settings.cjs                          useMarkdownEditor.ts         │
│                                          │                          │
│                                          ▼                          │
│                                        App.tsx                      │
│                                        ├── Sidebar.tsx (tree)       │
│                                        ├── Toolbar.tsx (formatting) │
│                                        └── NoteEditor.tsx (TipTap)  │
└─────────────────────────────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
    User's filesystem      SmartNotes/ folder
    (markdown files)       (default ~/Documents/SmartNotes)
```

### Electron main process modules

| Module | Responsibility |
|---|---|
| **main.cjs** | Creates the `BrowserWindow`, registers all IPC handlers, boots the folder watcher, manages app lifecycle (`activate`, `window-all-closed`). |
| **preload.cjs** | Uses `contextBridge` to expose a typed `window.smartNotes` API. Renderer never has direct Node.js access. |
| **notesStore.cjs** | All file-system operations: `listMarkdownFiles`, `getFileTree` (recursive), `readMarkdownFile`, `writeMarkdownFile` (atomic via temp-file + rename), `createNote`, `createFolder`, `deleteNote`. Path-traversal-safe via `safeJoin`. |
| **notesWatcher.cjs** | Wraps `chokidar` to watch `**/*.md` recursively. Debounces bursts (250 ms stabilityThreshold + 150 ms dedup timer). Emits a single "changed" event to the renderer. |
| **settings.cjs** | Reads/writes a JSON file in Electron's `userData` directory (stores `notesDir` path). |

### Renderer component tree

| Component / Hook | Purpose |
|---|---|
| **App.tsx** | Root layout. Composes Sidebar, Toolbar, NoteEditor. Owns save callback, folder-create prompt. |
| **Sidebar.tsx** | Renders a recursive `<TreeNode>` for every folder/file. Neon-purple folder icons, cyan active-note highlight. Delete on hover. Sidebar buttons: New Note, New Folder, Open (choose folder). |
| **Toolbar.tsx** | Formatting bar using `lucide-react` icons. Headings 1-3, bold, italic, strike, inline code, bullet/ordered list, blockquote, divider, undo, redo. Active state highlighted with cyan glow. |
| **NoteEditor.tsx** | Wraps `<EditorContent>` from TipTap. Shows an empty-state placeholder when no note is selected. Displays note path + save status in a top bar. |
| **useNotes.ts** | Custom hook that owns: `notesDir`, `tree` (file tree), `activeNote`, `status`. Exposes: `selectNote`, `createNote`, `createFolder`, `deleteNote`, `chooseFolder`, `readNoteContent`, `writeNoteContent`. Subscribes to `onNotesChanged` push events from the watcher. |
| **useMarkdownEditor.ts** | Initializes TipTap with `StarterKit` + `tiptap-markdown` (no HTML, paste/copy transforms). Exposes `editor` instance + `setContent(md)` that suppresses save-on-update during programmatic loads. Autosave with 400 ms debounce. |

### IPC channel inventory

| Channel | Direction | Payload | Response |
|---|---|---|---|
| `notes:getNotesDir` | renderer → main | — | `{ notesDir: string }` |
| `notes:selectNotesDir` | renderer → main | — | `{ notesDir, canceled? }` |
| `notes:list` | renderer → main | — | `NoteEntry[]` |
| `notes:fileTree` | renderer → main | — | `FolderEntry[]` (recursive) |
| `notes:read` | renderer → main | `{ name }` | `{ name, content }` |
| `notes:write` | renderer → main | `{ name, content }` | `{ ok }` |
| `notes:create` | renderer → main | `{ folder? }` | `{ name }` |
| `notes:createFolder` | renderer → main | `{ name }` | `{ ok }` |
| `notes:delete` | renderer → main | `{ name }` | `{ ok }` |
| `notes:changed` | main → renderer | — | (push event, no response) |

---

## Explainable RAG backend architecture

The RAG backend exists as a separate codebase today and will be integrated into `src/backend/`. Its core thesis:

> Move from **"trust the model"** to **"here's the exact evidence and reasoning trace."**

### Tech stack

| Component | Technology | Why |
|---|---|---|
| **API** | FastAPI | Lightweight, async, auto-docs via OpenAPI. Will become an optional local process or be embedded as IPC-callable module. |
| **Knowledge store** | Graph + paginated chunk storage (local) | Relationship-aware retrieval + efficient chunk loading at scale without a vector DB. |
| **Embeddings** | Ollama + `qwen3-embedding:8b` | 4096-dim, high-quality, fully local. No API calls. |
| **LLM** | Ollama + `qwen2.5:7b` | Domain classification + answer generation. Swappable. |
| **NLP** | SpaCy `en_core_web_trf` | Entity extraction, relation triples, knowledge graph construction. |
| **Tracing** | LangSmith (optional) | Observability for debugging — opt-in, not required. |

### Backend directory structure (current)

```text
app/
├── api/                # FastAPI route definitions + dependency injection
├── core/               # Config loader, environment variable management
├── db/                 # Graph + paginated chunk storage initialization
├── models/             # Pydantic request/response schemas
├── pipeline/           # The 6-stage RAG pipeline (see below)
├── utils/              # LLM wrappers, visualization helpers
└── main.py             # FastAPI app entry point

data/
├── graph_storage/      # Persistent graph nodes/edges on disk
├── chunk_pages/        # Paginated chunk records (content + metadata + embeddings)
└── uploads/            # Ingested source documents
```

### API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v3/ingest/` | POST | Upload and process documents (currently PDF). Runs chunking, domain classification, entity extraction, embedding, and storage. |
| `/api/v3/full_pipeline/` | POST | End-to-end RAG: decompose query → retrieve → build evidence graph → generate answer with citations. |
| `/api/v3/score_trust/` | POST | Score a generated answer's trustworthiness against its source evidence. |
| `/api/v3/query_decomposition/` | POST | Break a complex query into focused sub-queries for better retrieval. |
| `/api/v3/extract_entities/` | POST | Named entity recognition on arbitrary text. |
| `/api/v3/extract_relations/` | POST | Extract subject–predicate–object triples from text. |
| `/api/v3/visualize_graph/` | POST | Generate interactive knowledge graph visualizations from extracted entities/relations. |

---

## Pipeline stages in detail

The RAG system processes data through six conceptual stages, each independently testable and swappable:

### Stage 1 — Ingest

```text
Documents (PDF, future: MD, HTML) → Text extraction → Normalization
```

- Accepts uploaded files, extracts raw text.
- Preserves source metadata (filename, page number, section headers).
- **SmartNotes integration**: this stage will also accept `.md` notes from the local file tree, triggered by the folder watcher.

### Stage 2 — Chunk + metadata

```text
Raw text → Overlapping chunks → Metadata-enriched chunks
```

- Uses LangChain text splitters with configurable chunk size and overlap.
- Each chunk carries: `source`, `page`, `section`, `position`, `charStart`, `charEnd`.
- **Chunking strategy considerations**: for short notes, semantic paragraph splitting is preferred over fixed-size windows. For long-form notes, recursive character splitting with overlap ensures context isn't fragmented.

### Stage 3 — Domain classification

```text
Chunk → Local LLM (Qwen2.5) → Domain label
```

- Each chunk is classified into a knowledge domain (e.g., "machine-learning", "history", "personal").
- Enables domain-aware retrieval routing — queries about ML don't waste time searching personal journal entries.
- Classification runs entirely locally via Ollama.

### Stage 4 — Entity & relation extraction

```text
Chunk → SpaCy en_core_web_trf → Named entities + (subject, predicate, object) triples
```

- Extracts people, organizations, dates, concepts, locations.
- Builds knowledge triples: `("Einstein", "developed", "General Relativity")`.
- These triples form the basis of the knowledge graph layer.
- **Knowledge graph exploration**: the extracted graph can be queried directly, enabling "show me everything connected to X" without embedding search.

### Stage 5 — Embed + store

```text
Chunk → Ollama qwen3-embedding:8b → embeddings + metadata → graph + paginated chunk store
```

- Embeddings generated locally — no API calls.
- Store entities/relations in the graph layer and link them to chunk IDs.
- Store chunk content + metadata (and embeddings) in a paginated on-disk layout for fast batch retrieval.
- **Hybrid retrieval design**: graph traversal + keyword index (SQLite FTS5 / BM25) + embedding similarity scoring over the relevant chunk pages. Results can merge via Reciprocal Rank Fusion (RRF).

### Stage 6 — Retrieve + generate + explain

```text
Query → Decompose → Hybrid retrieve → Evidence graph → LLM generate → Trust score
```

1. **Query decomposition**: complex queries are broken into focused sub-queries.
2. **Hybrid retrieval**: each sub-query combines graph traversal, keyword search, and embedding similarity scoring.
3. **Evidence graph**: retrieved chunks are organized into an evidence structure showing which chunks support which parts of the answer.
4. **Answer generation**: local LLM produces an answer grounded in the evidence.
5. **Trust scoring**: the answer is scored against its sources — how well-supported is each claim?
6. **Explainable output**: the UI receives not just the answer, but the evidence graph, source contributions, and a validation trace.

### Explainability — what the user sees

```text
┌────────────────────────────────────────────────────────┐
│  Answer                                                 │
│  "Einstein published General Relativity in 1915..."     │
│                                                         │
│  ── Evidence ──────────────────────────────────────────  │
│  [1] physics-notes.md (chunk 3, p.2)  confidence: 0.94  │
│  [2] history-timeline.md (chunk 7)    confidence: 0.87  │
│                                                         │
│  ── Trust score: 0.91 ─────────────────────────────────  │
│  ── Knowledge graph: [Einstein]──developed──[GR] ─────  │
└────────────────────────────────────────────────────────┘
```

---

## Integration strategy

How the RAG backend integrates with the Electron desktop app:

### Option A — Embedded local process (preferred for v1)

```text
Electron main.cjs
  └── spawns backend as child process (Python/uvicorn)
        └── listens on localhost:random_port
              └── renderer queries via fetch → localhost
```

- Backend starts when the user opens the AI panel; shuts down on close.
- No long-running server. Spawn on demand.
- Communication: HTTP over localhost (already built into FastAPI).

### Option B — In-process Node.js (future)

- Port the pipeline stages to TypeScript.
- Run embeddings via ONNX Runtime (Node.js bindings).
- Eliminates the Python dependency entirely.
- More complex, but zero external process management.

### Shared contract

Both options expose the same interface to the renderer. The `window.smartNotes` API will gain AI-related methods:

```typescript
// Future additions to SmartNotesAPI
queryNotes: (query: string) => Promise<RAGResponse>
reindexNote: (name: string) => Promise<void>
getKnowledgeGraph: (query?: string) => Promise<GraphData>
getTrustScore: (answer: string, sources: string[]) => Promise<TrustScore>
```

The renderer never knows or cares whether the backend is Python or Node.js.

---

## Stepwise development plan

### Phase 0 — Foundation (✅ done)

- [x] Electron app scaffold with Vite + React + TypeScript
- [x] TipTap editor with markdown serialization
- [x] Local `.md` file storage with atomic writes
- [x] Recursive folder tree in sidebar
- [x] chokidar folder watcher (debounced, recursive)
- [x] Safe IPC bridge with typed API (`window.smartNotes`)
- [x] Dark neon theme (Tailwind + custom ProseMirror styles)
- [x] Modular component/hook architecture

### Phase 1 — Editor UX polish

- [ ] Note renaming (inline edit in sidebar)
- [ ] Drag-and-drop reorder / move between folders
- [ ] Search bar (filename filter, then full-text)
- [ ] Note metadata panel (created/modified dates, word count, tags from frontmatter)
- [ ] Keyboard shortcuts (Cmd/Ctrl+N new, Cmd/Ctrl+S explicit save, Cmd/Ctrl+P quick-open)
- [ ] Sidebar resize / collapse
- [ ] Multi-tab / split editor support

### Phase 2 — Local metadata index

- [ ] SQLite database for note metadata cache (faster than scanning filesystem)
- [ ] Frontmatter parsing + indexing (tags, title, aliases)
- [ ] Backlink extraction (`[[wikilinks]]` or `[text](note.md)`)
- [ ] Backlink panel in editor (show "notes that link to this note")
- [ ] Full-text search via SQLite FTS5

### Phase 3 — RAG backend integration

- [ ] Port the existing FastAPI backend into `src/backend/`
- [ ] Electron process manager: spawn/kill backend on demand
- [ ] Health check endpoint + retry logic
- [ ] Ingest pipeline adapted for `.md` files (not just PDF)
- [ ] Incremental indexing: only re-embed notes that changed (watcher-driven)
- [ ] Settings UI: choose Ollama models, embedding dimensions, chunk size

### Phase 4 — Hybrid retrieval

- [ ] Keyword index (SQLite FTS5 / BM25 scoring)
- [ ] Graph traversal retrieval (entity/relation-aware)
- [ ] Paginated chunk retrieval layer
- [ ] Embedding similarity scoring over chunk pages
- [ ] Reciprocal Rank Fusion merge strategy
- [ ] Query decomposition for complex questions
- [ ] Domain-aware routing (skip irrelevant domain chunks)
- [ ] Benchmarks on 1k / 10k / 50k note collections

### Phase 5 — Explainability UX

- [ ] "Ask your notes" panel in the editor
- [ ] Answer display with inline source citations
- [ ] "Why this answer?" evidence drawer (ranked chunks, confidence scores)
- [ ] Trust score badge
- [ ] Knowledge graph visualization (interactive, zoomable)
- [ ] Entity/relation browser ("show me everything about X")

### Phase 6 — Scale & performance

- [ ] Background indexing worker (no UI freezes)
- [ ] Embedding batch processing with progress indicator
- [ ] Incremental graph/page updates (add/remove, no full rebuild)
- [ ] LRU cache for recently accessed embeddings
- [ ] Lazy sidebar rendering for 10k+ note trees
- [ ] Stress test suite with synthetic note collections

### Phase 7 — Distribution & polish

- [ ] Electron Builder packaging (Windows / macOS / Linux installers)
- [ ] Auto-update mechanism (optional, privacy-respecting)
- [ ] First-run onboarding (choose notes folder, download Ollama models)
- [ ] Accessibility audit (keyboard nav, screen reader, contrast)
- [ ] End-to-end test suite (Playwright + Electron)

---

### Running locally

```bash
cd src/frontend
npm install
npm run dev          # starts Vite + Electron concurrently
npm run typecheck    # tsc --noEmit
npm run build        # production build into dist/
```

---

*This document will be updated as phases are completed and `src/backend/` is populated.*
