# Assignment 6 — Notes REST API

**Student:** Mariam Salloum

Rose Notes combines a pink browser interface with an Express API offering full CRUD and a persistent SQLite database. Requires **Node.js 24 or newer** and npm. SQLite is provided by Node.js; no separate database installation or credentials are needed. Node may print an experimental SQLite warning; this does not stop the server.

## Install and run

Extract this folder, open a terminal inside it, and run:

```sh
npm ci
```

Create `.env` from `.env.example`:

- Windows PowerShell: `Copy-Item .env.example .env`
- macOS/Linux: `cp .env.example .env`

Then run:

```sh
npm run dev
```

The server runs at `http://localhost:3000`. For normal execution without file watching, use `npm start`. Stop with Ctrl+C.

`.env` settings:

```dotenv
PORT=3000
DATABASE_PATH=./data/notes.sqlite
```

The database directory, file and schema are created automatically. Notes remain after a restart. Paths are relative to the project directory. The database, `.env`, and `node_modules` are excluded from Git. The ZIP deliberately excludes those generated/private files; the example configuration is included.

## Pink frontend

Open `http://localhost:3000` after starting the server. Rose Notes provides a responsive pink interface to create, view, edit, search and delete notes. It calls the same persistent REST API; no separate frontend build is needed. Changes are saved to SQLite and remain after reload. The search box filters the loaded notes locally.

Additional frontend routes: `GET /` serves the application, `GET /style.css` serves the stylesheet and `GET /app.js` serves the browser script (200).

## Resource and validation

A note has an integer `id`, `title`, `content`, `createdAt`, and `updatedAt`. Timestamps use ISO 8601 UTC. POST and PUT require both title and content. PUT fully replaces these two editable fields. Strings are trimmed; title must have 1–120 characters and content 1–10,000. Unknown fields, arrays, missing values, blank strings, invalid types and invalid IDs return 400. IDs must be positive safe integers. SQL queries use bound parameters.

## All available routes

| Method | Route | Success | Purpose |
| --- | --- | --- | --- |
| GET | `/notes` | 200 | List all notes, ordered by ID |
| GET | `/notes/:id` | 200 | Retrieve one note |
| POST | `/notes` | 201 | Create a note; sets Location header |
| PUT | `/notes/:id` | 200 | Replace title and content |
| DELETE | `/notes/:id` | 200 | Delete a note |

Examples below assume the created note has ID 1. Use the actual ID returned by POST. These curl commands use POSIX shell quoting; in Windows, import the included Postman collection or use a compatible shell.

### Create

```sh
curl -i -X POST http://localhost:3000/notes -H 'Content-Type: application/json' -d '{"title":"Study","content":"Review REST APIs"}'
```

Response: **201**, `Location: /notes/1` (timestamps below are illustrative):

```json
{"id":1,"title":"Study","content":"Review REST APIs","createdAt":"2026-11-09T12:00:00.000Z","updatedAt":"2026-11-09T12:00:00.000Z"}
```

### List all

```sh
curl http://localhost:3000/notes
```

Response: **200**:

```json
[{"id":1,"title":"Study","content":"Review REST APIs","createdAt":"2026-11-09T12:00:00.000Z","updatedAt":"2026-11-09T12:00:00.000Z"}]
```

An empty database returns `[]`.

### Retrieve one

```sh
curl http://localhost:3000/notes/1
```

Response: **200**, the same note object shown in the create example.

### Update

```sh
curl -X PUT http://localhost:3000/notes/1 -H 'Content-Type: application/json' -d '{"title":"Updated","content":"Finished"}'
```

Response: **200**:

```json
{"id":1,"title":"Updated","content":"Finished","createdAt":"2026-11-09T12:00:00.000Z","updatedAt":"2026-11-09T12:05:00.000Z"}
```

### Delete

```sh
curl -X DELETE http://localhost:3000/notes/1
```

Response: **200**:

```json
{"message":"Note deleted."}
```

### Error responses

Invalid POST/PUT example: `{"title":"","content":"x"}` returns **400**:

```json
{"error":"Validation failed.","details":["title must be a non-empty string of at most 120 characters."]}
```

Malformed JSON returns **400** `{"error":"Malformed JSON body."}`. Invalid IDs return **400** `{"error":"ID must be a positive safe integer."}`. A valid ID with no matching note returns **404** `{"error":"Note not found."}` on GET, valid PUT, or DELETE. Unknown routes return **404** `{"error":"Route not found."}`. Bodies over 100kb return **413** `{"error":"JSON body exceeds 100kb."}`. Unexpected request/database failures return **500** `{"error":"Internal server error."}` without exposing internal details. Startup configuration/database access errors are printed to the terminal so configuration can be corrected.

## Test the API

```sh
npm test
```

Tests start their own HTTP server and a real temporary SQLite file, then clean up. They cover CRUD, status codes, invalid create/update input, malformed JSON, invalid IDs, missing records/routes, and persistence after closing and reopening the database. No running development server is needed. The captured run is in `evidence/test-results.txt`.

Import `postman/Notes_API.postman_collection.json` into Postman. Start the dev server and run the collection **in the listed order**. `baseUrl` defaults to `http://localhost:3000`. The create request automatically captures `noteId`; later requests use it. All 11 requests include status assertions. This collection is repeatable and deletes its own note.

## GitHub submission and commits

Upload the extracted project contents to your own GitHub repository. Do not upload `node_modules`, `.env`, or the generated database. `package-lock.json` is included for reproducible installs.

For a new local repository:

```sh
git init -b main
git add .
git commit -m "Add persistent Notes REST API, validation, documentation and tests"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

If Git asks for your identity, set your own Git name and email first. Do not use an invented email. `COMMIT_HISTORY.txt` records the actual packaging commits, and `submission-history.bundle` preserves them. To restore those commits instead of creating a new commit, clone the bundle into a separate folder:

```sh
git clone submission-history.bundle ../Mariam_Salloum_Notes_API
```

Then set your GitHub remote in that cloned folder with `git remote set-url origin YOUR_GITHUB_REPOSITORY_URL` and push `main`. The bundle's commit author is `Submission Builder`, to distinguish preparation from your own Git identity. Both upload methods include all required source files and test evidence.
