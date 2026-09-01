# SQL Practice

An interactive, self-contained SQL learning platform. Everything — the SQL engine, the practice databases, and your
progress — runs entirely in your browser. No backend, no signup, no server-side database.

## Features

- **Real SQL engine**: [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) runs actual SQL queries in the browser.
- **3 built-in datasets**: Healthcare, E-commerce, and Company/Employees — realistic, related, with NULLs and duplicates baked in.
- **54 hand-written questions** across Beginner, Intermediate, and Advanced, each with progressive hints, a full worked
  solution + explanation, and result-based (not exact-text) validation.
- **SQL Playground**: run arbitrary queries against any of the three datasets, with query history and sample queries.
- **Practice modes**: guided, random, and interview mode (timed, hints hidden).
- **Progress tracking**: stored in `localStorage` — solved counts, streaks, topic strengths/weaknesses.
- **Schema explorer**: browse tables, columns, types, primary/foreign keys and relationships for every dataset.
- **PDF Practice**: upload a PDF containing SQL schemas, sample data, questions and answers, and it's turned into an
  interactive practice set — same engine, editor, and results table as the rest of the app. Everything is processed
  and stored locally in the browser (IndexedDB); nothing is uploaded anywhere.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

Open the printed local URL in your browser. That's it — no environment variables, no database setup, no API keys.

## Project structure

```
src/
  data/          # dataset DDL + seed data + schema metadata (healthcare, ecommerce, company)
  sql-engine/     # DuckDB-WASM initialization and query runner
  questions/      # question bank (beginner.ts, intermediate.ts, advanced.ts)
  validation/     # result-set based query validation
  progress/       # localStorage-backed progress + query history hooks
  components/     # SchemaExplorer, SqlEditor (Monaco), ResultsPanel, QuestionPanel, Layout
  pages/          # Landing, Practice (levels/topics/modes), Question (workspace), Playground, ProgressPage
  pages/pdf/      # PdfLibrary (upload/review/list) and PdfPractice (workspace) pages
  pdf-practice/   # PDF text extraction (pdfjs), SQL/text schema parsing, question/answer parsing,
                  # heuristic hints/explanations, IndexedDB storage, DuckDB schema orchestration
```

## PDF Practice — how extraction works

PDFs are parsed entirely client-side with `pdfjs-dist` (no upload, no external API):

1. **Schema**: `CREATE TABLE` / `INSERT INTO` statements are detected and used directly if present. Otherwise, a
   fallback heuristic looks for plain-text schema listings (a table name line followed by a block of bare column-name
   lines) and synthesizes `CREATE TABLE` statements from them, guessing column types from naming conventions
   (`_id` → INTEGER, `date` → DATE, `salary`/`price`/`total` → DOUBLE, else VARCHAR).
2. **Questions/answers**: two formats are supported — explicit `Question:` / `Answer:` (or `Solution:`) labels, and
   numbered lists (`1. ...`) where a SQL-looking line within the same numbered block is treated as the answer.
   Whichever format yields more matches wins.
3. **Isolation**: every uploaded PDF gets its own DuckDB `SCHEMA` (e.g. `pdf_myfile_ab12cd`) on the **same shared
   DuckDB-WASM connection** used everywhere else in the app — no second SQL engine, and no collisions between PDFs or
   with the built-in datasets.
4. **Validation**: an extracted answer is executed once against the built database during import; if it errors, that
   question is downgraded to "no answer" rather than silently kept broken. At grading time, both the user's query and
   the extracted answer are executed and their *results* are compared (columns, row count, values, and order only
   when the answer itself uses `ORDER BY`) — never a text comparison, so logically equivalent queries are accepted.
5. **Hints and "Show Answer" explanations** are generated heuristically from the SQL keywords/functions present in
   the extracted answer (JOIN, GROUP BY, window functions, CTEs, subqueries, etc.) — they're rule-based, not an LLM
   call, so treat them as solid pointers rather than a free-form tutor.

Extraction is a best-effort heuristic parser, not a general-purpose PDF understanding model. It was tested end-to-end
against a generated 3-page sample PDF (3 tables via `CREATE TABLE`/`INSERT`, 13 questions in `Question:`/`Answer:`
format, one deliberately missing an answer) and correctly extracted all tables, all 13 questions, and 12/13 answers.
Scanned/image-only PDFs (no selectable text) and heavily columnar/visual table layouts are out of scope — there's no
OCR or layout-vision step.

## Notes on scope

The spec called for roughly 40-50 questions per level (120-150 total). This build ships 54 total (20 beginner, 18
intermediate, 16 advanced) — a smaller but fully working, fully validated set covering every topic and technique
listed in the spec (JOIN variants, set operators, subqueries, CTEs including recursive, all the major window
functions, gaps-and-islands, Nth-highest-salary, conditional aggregation, etc). The question bank is a plain
TypeScript array (`src/questions/*.ts`) that follows a consistent shape, so extending it with more questions per
topic is a mechanical, low-risk addition.

Every question's own solution was run end-to-end through the app (not just eyeballed) to confirm it validates as
correct against the seeded data.
