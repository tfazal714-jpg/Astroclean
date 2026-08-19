# AstroClean

Privacy-first, browser-native B2B lead CSV scrubbing and enrichment.

AstroClean loads a lead list (CSV/TSV) entirely in your browser, cleans and
enriches it through an auditable operation pipeline, and lets you export the
result  no uploads, no accounts, and no data ever leaving your machine. All
processing runs on [DuckDB-WASM](https://duckdb.org/docs/stable/clients/wasm/overview.html)
inside a Web Worker.

## Highlights

- **Local-first data engine**  DuckDB compiled to WebAssembly runs the full
  pipeline (sniffing, scrubbing, enrichment) in a background worker. Results
    in seconds, no server queues, no uploads.
    - **Auditable pipeline**  every operation is recorded and replayed from the
      raw upload, so results are always reproducible. Undo / redo / reset at any
        time; click an operation to inspect its exact parameters.
        - **Privacy by default**  no accounts, no cookies, no analytics, no
          fingerprinting. The only data that ever leaves your machine is what you
            choose to send to your own AI provider during an AI operation.
            - **Animated, responsive UI**  scroll-reveal motion, count-up stats, an
              onboarding tour, toasts, confetti and a command palette. Desktop-first,
                fully usable on mobile (the ops sidebar becomes a slide-over drawer).

                ## Features

                ### Cleaning operations (Open Refine-style)

                - Trim whitespace
                - Remove empty rows
                - Remove duplicates (full-row or keyed on selected columns)
                - Change case (lower / upper / title)
                - Normalize email (lowercase + trim, optional validity flag)
                - Normalize phone (digits only, optional validity flag)
                - Fill empty values
                - Remove / rename columns
                - Find & replace with regular expressions
                - Split a column into multiple columns on a delimiter
                - Merge columns into one (skips empty cells)
                - Keep or drop rows matching a value, text or regex

                ### Enrichment operations

                - Extract email domain
                - Infer company name from a domain
                - Split full names into first/last
                - Extract a regex capture group into a new column
                - Infer numeric / date column types

                ### AI enrichment with your own API keys

                - Bring your own key for **OpenRouter**, **xAI (Grok)**, **Orca Router**, or any
                  OpenAI-compatible endpoint  keys live only in your browser's localStorage
                    and are sent exclusively to the provider you choose.
                    - One flexible *AI transform* op: pick input columns, write a prompt rule with
                      `{{column}}` placeholders, choose an output column, and optionally only fill
                        empty cells. A **preset gallery** ships ready-made prompts (industry
                          classifier, seniority, sentiment, domain extraction and more).
                          - Batched and concurrent (fast), cancellable, with live row progress.
                          - Results are cached in IndexedDB keyed by the pipeline state, so undo/redo
                            replays are instant and free  no repeated API calls.
                            
                            ### Workspace & data tools
                            
                            - **Import preview**  after dropping a file you can confirm the delimiter,
                              header row and optional per-column type overrides against a live sample
                                before it loads.
                                - **High-performance grid**  virtualized, sortable, infinite-scroll table
                                  with search-as-you-type across all columns, column visibility toggles,
                                    row-density control, and click-to-copy cells (or copy the visible page as
                                      CSV).
                                      - **Data quality report**  a 0100 score with duplicate/empty/malformed
                                        value detection, per-column health chips, and a downloadable text report.
                                        - **Columns panel**  fill rate, distinct counts, value-type hints and top
                                          values per column; click a column to expand full details.
                                          - **Export options**  CSV, TSV or JSON, with delimiter, header and
                                            empty-cell placeholder settings (native DuckDB COPY, JS fallback).
                                            
                                            ### App experience
                                            
                                            - **Onboarding tour**  a spotlight walkthrough of the key screens on first
                                              visit (replayable from Settings or the command palette).
                                              - **Command palette** (Ctrl+K)  fuzzy-searchable actions: load samples, run
                                                the guided demo, export, quality report, theme, shortcuts and more.
                                                - **Guided demo**  loads the sample and applies a showcase pipeline
                                                  (trim  dedupe  normalize email) step by step with toasts.
                                                  - **Sample gallery**  six generated datasets (leads, products, orders,
                                                    tickets, invoices, employees) with realistic "dirty" data.
                                                    - **Activity metrics**  files processed, rows handled, operations applied,
                                                      exports and AI values, with a per-file history and charts (7-day bar chart,
                                                        source donut)  stored only in your browser.
                                                        - **Toasts & confetti**  lightweight notifications and a celebratory burst
                                                          on export.
                                                          - **Settings**  providers, appearance (system/light/dark, reduce motion),
                                                            export defaults, and data management (clear activity, clear AI cache,
                                                              replay tour).
                                                              
                                                              ## Keyboard shortcuts
                                                              
                                                              | Shortcut | Action |
                                                              | --- | --- |
                                                              | `Ctrl+K` / `Ctrl+P` | Command palette |
                                                              | `Ctrl+?` | Shortcut reference |
                                                              | `Ctrl+E` | Export dataset |
                                                              | `Ctrl+N` | New dataset |
                                                              | `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo operation |
                                                              | `Ctrl+Shift+R` | Reset pipeline |
                                                              | `Ctrl+Shift+D` | Toggle dark mode |
                                                              | `Esc` | Close dialogs & popovers |
                                                              | Click a cell | Copy its value |
                                                              
                                                              Shortcuts are ignored while typing in form fields.
                                                              
                                                              ## Getting started
                                                              
                                                              ```bash
                                                              npm install
                                                              npm run dev      # start the dev server
                                                              npm run build    # production build (outputs to dist/)
                                                              npm run preview  # serve the production build locally
                                                              npm run lint     # run oxlint
                                                              ```
                                                              
                                                              Open the printed local URL, then either drop a CSV/TSV onto the page or load
                                                              a sample dataset to see the pipeline in action. Press `Ctrl+K` and choose
                                                              *Run guided demo* for a full walkthrough.
                                                              
                                                              > **Note on the dev server:** `vite.config.js` sets
                                                              > `Cross-Origin-Opener-Policy: same-origin` and
                                                              > `Cross-Origin-Embedder-Policy: require-corp`, which lets DuckDB-WASM use the
                                                              > faster SIMD (EH) bundle. Keep these headers when serving the production
                                                              > build (e.g. on a static host) for the same reason; without them the app
                                                              > still works, just with the non-SIMD bundle.
                                                              
                                                              ## Architecture
                                                              
                                                              ```
                                                              src/
                                                                App.jsx                 App shell: DuckDB boot, dataset lifecycle, undo/redo history,
                                                                                          settings/theme, shortcuts, command palette, modals
                                                                                            main.jsx                Entry point (ErrorBoundary + ToastProvider)
                                                                                              components/
                                                                                                  UploadView.jsx        Homepage: animated hero, drop zone, trust grid, FAQ
                                                                                                      Workspace.jsx         Sidebar (ops/columns/AI) + grid layout (drawer on mobile)
                                                                                                          OpsPanel.jsx          Operation pickers and parameter forms (+ AI prompt presets)
                                                                                                              ColumnsPanel.jsx      Per-column quality statistics (+ expandable detail view)
                                                                                                                  PipelineCard.jsx      Applied operations with expandable params, undo/redo/reset
                                                                                                                      DataGrid.jsx          Virtualized, sortable, searchable table
                                                                                                                          GridToolbar.jsx       Search, column visibility, density, copy page, quality report
                                                                                                                              Header.jsx            App header (logo, theme toggle, settings, metrics)
                                                                                                                                  Logo.jsx              Brand mark + wordmark
                                                                                                                                      SettingsModal.jsx     Tabs: providers, appearance, export defaults, data
                                                                                                                                          MetricsModal.jsx      Activity stats + per-file history + charts
                                                                                                                                              ExportModal.jsx       CSV/TSV/JSON export options
                                                                                                                                                  ImportPreviewModal.jsx Delimiter/header/type preview before load
                                                                                                                                                      QualityReportModal.jsx Data-quality score and issues
                                                                                                                                                          OnboardingTour.jsx    Spotlight walkthrough
                                                                                                                                                              CommandPalette.jsx    Ctrl+K fuzzy action search
                                                                                                                                                                  ShortcutsModal.jsx    Keyboard shortcut reference
                                                                                                                                                                      SamplePickerModal.jsx Sample dataset gallery
                                                                                                                                                                          Toast.jsx             Notification provider + viewport
                                                                                                                                                                              Confetti.jsx          Export celebration
                                                                                                                                                                                  StatusBar.jsx         Engine state + version footer
                                                                                                                                                                                      ErrorBoundary.jsx     Render-error recovery
                                                                                                                                                                                          Skeletons.jsx         Shimmer loading states
                                                                                                                                                                                              FaqSection.jsx        Homepage FAQ accordion
                                                                                                                                                                                                  TrustMarquee.jsx      Scrolling trust badges
                                                                                                                                                                                                      ColumnDetail.jsx      Expandable column detail view
                                                                                                                                                                                                          ui.jsx                Shared primitives: Button, Badge, Spinner, inputs
                                                                                                                                                                                                              motion/               FadeIn, SlideIn, ScaleIn, Stagger, CountUp, Shimmer, Marquee
                                                                                                                                                                                                                  charts/               BarChart, Sparkline, Donut (dependency-free SVG)
                                                                                                                                                                                                                    hooks/                  useInView, useCountUp, useDebounce, useClipboard,
                                                                                                                                                                                                                                              useKeyboardShortcuts, useFocusTrap, useMediaQuery, 
                                                                                                                                                                                                                                                services/
                                                                                                                                                                                                                                                    duckdb.js             DuckDB singleton, CSV loading (+ import options), pipeline, export
                                                                                                                                                                                                                                                        ai.js                 Provider registry, localStorage persistence, OpenAI client
                                                                                                                                                                                                                                                            aiCache.js            IndexedDB (Dexie) cache for AI results keyed by pipeline prefix
                                                                                                                                                                                                                                                              utils/
                                                                                                                                                                                                                                                                  scrubbers.js          Operation registry: UI field schema + SQL builders
                                                                                                                                                                                                                                                                      csv.js                JS CSV parse/stringify fallbacks
                                                                                                                                                                                                                                                                          sampleData.js         Six deterministic sample generators + gallery
                                                                                                                                                                                                                                                                              quality.js            Data-quality scoring engine
                                                                                                                                                                                                                                                                                  settings.js           App settings store (appearance/export/grid)
                                                                                                                                                                                                                                                                                      metrics.js            User activity tracking (localStorage)
                                                                                                                                                                                                                                                                                          promptPresets.js      Ready-made AI transform prompts
                                                                                                                                                                                                                                                                                              demo.js               Guided demo script
                                                                                                                                                                                                                                                                                                  format.js, date.js, fileSize.js, strings.js, anim.js, storage.js, guid.js, cn.js, opIcons.js
                                                                                                                                                                                                                                                                                                  ```
                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                  ### How the pipeline works
                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                  1. On upload, the file is sniffed and materialized into a `raw_*` table via
                                                                                                                                                                                                                                                                                                     `read_csv` (falling back to a JS parser for files DuckDB can't auto-detect).
                                                                                                                                                                                                                                                                                                        Optional import settings (delimiter, header, column type overrides) are
                                                                                                                                                                                                                                                                                                           applied here.
                                                                                                                                                                                                                                                                                                           2. Every applied operation is appended to the pipeline history in app state.
                                                                                                                                                                                                                                                                                                           3. Whenever the pipeline changes, `rebuildPipeline` drops the `work_*` table,
                                                                                                                                                                                                                                                                                                              recreates it from `raw_*`, and replays each operation's SQL in order.
                                                                                                                                                                                                                                                                                                              4. Undo/redo moves the history index; the pipeline replays from the raw upload
                                                                                                                                                                                                                                                                                                                 for that state  so the working table is always exactly the pipeline output.
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 Operations in `scrubbers.js` are declarative: each defines its form fields
                                                                                                                                                                                                                                                                                                                 (`fields`) and either a `build(table, params, schema)` returning DuckDB SQL
                                                                                                                                                                                                                                                                                                                 (optionally `replace: true` for an atomic table swap) or an `apply(conn, ...)`
                                                                                                                                                                                                                                                                                                                 for data-driven work like type inference.
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 ## Styling
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 Design tokens (colors, radii, shadows, fonts) live in
                                                                                                                                                                                                                                                                                                                 `src/styles/index.css` under Tailwind v4's `@theme` block. The aesthetic is a
                                                                                                                                                                                                                                                                                                                 deliberately restrained, enterprise-engineering look: slate neutrals with a
                                                                                                                                                                                                                                                                                                                 sparing teal accent, near-square corners, dense typography, and flat
                                                                                                                                                                                                                                                                                                                 bordered controls. Dark mode is driven by the `dark` class on the root
                                                                                                                                                                                                                                                                                                                 element. Animation keyframes (logo, scan, shimmer, marquee, toast, confetti)
                                                                                                                                                                                                                                                                                                                 live at the bottom of the same file and always respect
                                                                                                                                                                                                                                                                                                                 `prefers-reduced-motion`.
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 ## API keys & privacy
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 Open the **gear icon** (top right)  *Providers* to add API providers.
                                                                                                                                                                                                                                                                                                                 Pre-filled presets for OpenRouter, xAI, and Orca Router; anything
                                                                                                                                                                                                                                                                                                                 OpenAI-compatible works via the custom option. Use *Test connection* to
                                                                                                                                                                                                                                                                                                                 verify a key before saving.
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 Keys are stored only in `localStorage` and are sent exclusively to the provider
                                                                                                                                                                                                                                                                                                                 you select. When an AI operation runs, row values are sent to that provider for
                                                                                                                                                                                                                                                                                                                 processing  this is the only part of the app where data leaves your machine,
                                                                                                                                                                                                                                                                                                                 and it happens only when you explicitly run an AI op. The Settings modal shows
                                                                                                                                                                                                                                                                                                                 this notice inline.
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 ## Performance notes
                                                                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                                                                 - The grid is virtualized and pages 500 rows at a time  large files stay
                                                                                                                                                                                                                                                                                                                   responsive on modest hardware.
                                                                                                                                                                                                                                                                                                                   - AI ops send rows in batches (default 10 per request) with limited concurrency
                                                                                                                                                                                                                                                                                                                     (default 3), so memory stays flat regardless of file size. Adjust both in the
                                                                                                                                                                                                                                                                                                                       op form; lower concurrency on very slow machines.
                                                                                                                                                                                                                                                                                                                       - AI results are cached in IndexedDB, so re-applying an op or undo/redo never
                                                                                                                                                                                                                                                                                                                         re-bills your API key.
                                                                                                                                                                                                                                                                                                                         - The whole UI uses CSS transforms/opacity for motion (no layout thrash), and
                                                                                                                                                                                                                                                                                                                           animations disable themselves for reduced-motion users.
                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                           ## Limitations
                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                           - Column names are preserved verbatim; CSV headers must appear in the first row
                                                                                                                                                                                                                                                                                                                             (the import preview lets you confirm this before loading).
                                                                                                                                                                                                                                                                                                                             - The grid previews pages of 500 rows on demand; the exported file always
                                                                                                                                                                                                                                                                                                                               contains the full working table.
                                                                                                                                                                                                                                                                                                                               - Enrichment operations are rule-based (regex / SQL), not AI-powered  no
                                                                                                                                                                                                                                                                                                                                 external API calls are made.
                                                                                                                                                                                                                                                                                                                                 )))))