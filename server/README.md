# Tabletop Bridge Agent

A small local HTTP + WebSocket service that proxies the Tabletop browser UI to
a MySQL server. The frontend never talks to MySQL directly — it always goes
through this bridge running on `localhost`.

## Why

Browsers cannot open raw TCP sockets to a MySQL server, and shipping
credentials to a remote backend defeats the purpose of a local-first tool.
The bridge runs on your machine, owns the MySQL connection pool, and exposes
a small typed HTTP API plus a WebSocket channel for live query status.

## Quick start

```bash
cd server
cp .env.example .env
# edit CRED_KEY to a random 32-char string
npm install
npm run dev
```

The bridge starts on `http://localhost:7717` by default. Open the Tabletop UI,
click the bridge status pill in the title bar, and verify it shows "Online".

## API

| Method | Path                              | Purpose                          |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/health`                         | Liveness probe                   |
| POST   | `/connections/test`               | Try a connection without saving  |
| POST   | `/connections/connect`            | Open + cache a pool, return id   |
| POST   | `/connections/disconnect`         | Close a pool                     |
| GET    | `/schemas?connectionId=...`       | List databases                   |
| GET    | `/tables?connectionId=...&db=...` | List tables + views              |
| GET    | `/tables/:table/columns`          | Columns + indexes + FKs          |
| POST   | `/query/execute`                  | Run arbitrary SQL                |
| POST   | `/query/preview`                  | Wrap query with `LIMIT n`        |
| POST   | `/rows/insert`                    | Insert one row                   |
| POST   | `/rows/update`                    | Update one row by primary key    |
| POST   | `/rows/delete`                    | Delete one row by primary key    |

WebSocket endpoint: `ws://localhost:7717/ws` — broadcasts `{type, payload}`
events for query lifecycle and bridge logs.

## Security model

- CORS is locked to `CORS_ORIGINS`.
- Stored credentials are AES-256-GCM encrypted with `CRED_KEY`.
- Queries run with `QUERY_TIMEOUT_MS` enforced via `KILL QUERY`.
- `SAFE_MODE=true` blocks `DROP`, `TRUNCATE`, and unscoped `DELETE`/`UPDATE`.
- The bridge listens on `127.0.0.1` only — it is not reachable from the LAN.

## Architecture

```
server/src/
  config/        env + constants
  db/            mysql pool registry, credential crypto, lowdb metadata
  middleware/    error handler, request validation
  repositories/  raw SQL queries (schema, query, rows)
  services/      orchestration (connection, query)
  routes/        Express handlers
  websocket/     ws server + broadcast bus
  utils/         shared helpers
  index.ts       entry point
```

Future drivers (PostgreSQL, MongoDB, Redis) plug in as additional pool
registries behind the same repository interfaces.