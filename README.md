# BullMQ File Processing Pipeline 🚀

This project demonstrates how to build a scalable, asynchronous file processing pipeline using BullMQ, S3, Sequelize, and PostgreSQL.

## 🔧 Features

- Upload CSV/Excel/DBF files via an API
- Store files in S3
- Track file processing status in PostgreSQL
- Background validation and mapping jobs using BullMQ
- Final data storage in a  table

## 📦 Tech Stack

- Node.js + Express
- PostgreSQL + Sequelize
- BullMQ + Redis
- AWS S3
- Multer for file upload

# BullMQ File Processing Pipeline

Lightweight pipeline that accepts CSV uploads, stores files in S3, enqueues background jobs with BullMQ, and persists parsed rows into a dump table via Sequelize/Postgres.

Key features

- CSV upload endpoint with S3 storage and processing tracking
- Background job workers using BullMQ + Redis
- CSV parsing with configurable date handling and header validation
- UI for monitoring queues (`/bullui`) protected with basic auth

Prerequisites

- Node 18+ and npm
- PostgreSQL
- Redis
- (Optional) AWS S3 credentials to enable S3 uploads

Quickstart

1. Install dependencies:

```bash
npm install
```

2. Copy and edit environment variables:

```bash
cp .env.example .env
# then edit .env to set DB, Redis and AWS credentials
```

3. Start the app:

```bash
# production-style
npm start

# development with auto-reload
npm run dev
```

API

- Upload endpoint: POST `/upload/upload` — multipart form with field `file` and optional `upload_type`.

Example (CSV):

```bash
curl -F "file=@/path/to/data.csv" -F "upload_type=bse_scheme" http://localhost:3000/upload/upload
```

Queue UI (Bull UI)

- Installed and mounted at: `http://localhost:3000/bullui`
- Protected with HTTP Basic Auth using `BULLUI_USER` and `BULLUI_PASS` (defaults in `.env.example`).

Database migrations

This repo uses Sequelize migrations. To create the tables run:

```bash
npm install
npm run db:migrate
```

To undo last migration:

```bash
npm run db:migrate:undo
```

Testing

Run automated tests (Jest + Supertest):

```bash
npm test
```

Notes about test mode

- When `NODE_ENV=test` the app avoids starting workers and the HTTP server and the service layer uses lightweight test-mode shortcuts so tests run reliably without AWS/Redis/Postgres.

Useful scripts

- `npm start` — run the app
- `npm run dev` — run with `nodemon`
- `npm test` — run test suite
- `npm run db:migrate` — run Sequelize migrations
- `npm run db:migrate:undo` — undo last migration

Development

- Source is under `src/`.
- Add queue processors in `src/queuesProcessors/` and jobs in `src/jobs/`.

Security

- Keep real credentials out of the repository. Use `.env` and store secrets in your CI provider or vault.
- The Bull UI is protected by `express-basic-auth` — change the default credentials in `.env` before deploying.

Contributing

- Open a PR with clear description and tests for new behaviour.

License

- ISC
