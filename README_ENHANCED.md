# BullMQ File Processing Pipeline 🚀

An scalable asynchronous file processing pipeline built with **BullMQ**, **Redis**, **PostgreSQL**, **Sequelize**, **Express**, and **AWS S3**.

## 🔧 Features

- ✅ **CSV Upload API** — Accept file uploads via multipart form
- ✅ **S3 Integration** — Automatically store files in AWS S3
- ✅ **Background Processing** — Queue jobs using BullMQ + Redis
- ✅ **Database Tracking** — Track file status in PostgreSQL with Sequelize
- ✅ **Queue Monitoring** — Built-in Bull UI dashboard for queue visibility
- ✅ **Error Handling** — Automatic retries with exponential backoff
- ✅ **CSV Parsing** — Configurable date handling and header validation
- ✅ **Test Mode** — Lightweight test environment that avoids external services
- ✅ **Full Test Suite** — Jest + Supertest for API and job testing

## 📦 Tech Stack

- **Runtime:** Node.js 18+ + Express
- **Database:** PostgreSQL + Sequelize ORM
- **Queue:** BullMQ + Redis
- **Storage:** AWS S3
- **File Upload:** Multer
- **Testing:** Jest + Supertest
- **Monitoring:** Bull-Board Dashboard

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Client (Browser/API)                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌────────────────────┐
         │  Express API       │
         │  - Upload Endpoint │
         │  - Bull UI Board   │
         └────────┬───────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
  ┌────────┐ ┌────────┐ ┌─────────────┐
  │ Multer │ │ S3     │ │ PostgreSQL  │
  │ (File) │ │ (File) │ │ (Metadata)  │
  └────────┘ └────────┘ └─────────────┘
             │
             ▼
      ┌─────────────────┐
      │ BullMQ Queue    │
      │ (Redis)         │
      └────────┬────────┘
             │
             ▼
      ┌──────────────────────┐
      │ Background Workers   │
      │ - CSV Parser         │
      │ - Data Validator     │
      │ - Dump Table Creator │
      └──────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **Redis** 6+
- **(Optional) AWS S3** credentials for file storage

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` with your configuration:

```env
# PostgreSQL
DB_PSQL_USERNAME=postgres
DB_PSQL_PASSWORD=your_password
DB_PSQL_DATABASE=file_processor
DB_PSQL_PORT=5432
DB_PG_PRIMARY=localhost

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3
AWS_ACCESS_KEY_ID=your_key_id
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your_bucket_name

# Bull UI Dashboard
BULLUI_USER=admin
BULLUI_PASS=securepassword
```

### 3. Set Up Database

Create tables using Sequelize migrations:

```bash
npm run db:migrate
```

To undo migrations:

```bash
npm run db:migrate:undo
```

### 4. Start the Application

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The app will start on **`http://localhost:3000`**

---

## 📡 API Endpoints

### Upload a File

**Endpoint:** `POST /upload`

**Parameters:**
- `file` (multipart) — CSV file to upload (required)
- `upload_type` (form field) — Schema type for processing (optional, defaults to 'default')

**Example using cURL:**

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@./test/fixtures/sample.csv" \
  -F "upload_type=bse_scheme"
```

**Response (Success):**

```json
{
  "success": true,
  "message": "file upload successful",
  "data": {
    "file_upload_id": 1
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "UnprocessableError",
  "message": "Only CSV files are accepted at this time"
}
```

### Get Upload Status

**Endpoint:** `GET /upload`

**Query Parameters:**
- `page` (optional, default: 1) — Page number for pagination
- `limit` (optional, default: 10) — Items per page
- `schema_name` (optional) — Filter by schema type
- `start_date` (optional) — Filter by start date (YYYY-MM-DD)
- `end_date` (optional) — Filter by end date (YYYY-MM-DD)

**Example:**

```bash
curl "http://localhost:3000/upload?page=1&limit=10&schema_name=bse_scheme"
```

**Response:**

```json
{
  "meta": {
    "success": true,
    "total": 42,
    "page": 1,
    "limit": 10
  },
  "data": {
    "files": [
      {
        "id": 1,
        "filename": "data.csv",
        "status": "processing",
        "schema_name": "bse_scheme",
        "s3_location": "https://s3.us-east-1.amazonaws.com/...",
        "s3_key": "bse_scheme/data.csv",
        "file_type": "csv",
        "createdAt": "2026-02-24"
      }
    ],
    "schemaNames": {
      "BSE_SCHEME": "BSE Scheme"
    }
  }
}
```

---

## 🎛 Queue Monitoring Dashboard

**Access URL:** `http://localhost:3000/bullui`

**Authentication:**
- Username: `admin` (or `BULLUI_USER` env var)
- Password: `password` (or `BULLUI_PASS` env var)

The Bull-Board dashboard shows:
- ✅ Active jobs
- ⏳ Pending jobs
- ❌ Failed jobs
- 🔄 Job retries and status
- 📊 Queue statistics

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- test/upload_success.test.js
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Test Coverage

```bash
npm test -- --coverage
```

**Test Files:**
- `test/upload_success.test.js` — CSV upload success scenarios
- `test/bullui.test.js` — Queue UI authentication tests
- `test/upload.test.js` — Additional upload validation tests

**Test Mode Features:**
- Disables HTTP server startup
- Uses in-memory file storage (no disk I/O)
- Skips database operations (lightweight stubs)
- Avoids AWS S3 and Redis connections
- Returns mock responses for testing API contracts

---

## 📦 Project Structure

```
bullmq-file-processor/
├── config/
│   ├── database-connection.js    # Sequelize config
│   ├── redis.js                  # Redis client setup
│   ├── env.js                    # Environment variables
│   └── sequelize.js              # Sequelize instance
├── lib/
│   ├── logger.js                 # Logging utilities
│   └── sequelize.js              # Sequelize wrapper
├── migrations/
│   ├── 20260223100000-create-file-uploads.js
│   └── 20260223101000-create-bsc-dump-rows.js
├── src/
│   ├── app.js                    # Express app & error handler
│   ├── controller/
│   │   └── fileUploadController.js
│   ├── jobs/
│   │   ├── baseJob.js            # Base class for all jobs
│   │   └── createDumpTableJob.js
│   ├── models/
│   │   ├── fileUpload.js
│   │   └── bscDumpRows.js
│   ├── queuesProcessors/
│   │   ├── bullmqBaseProcessor.js
│   │   └── createDumpTableQueueProcessor.js
│   ├── routes/
│   │   ├── fileUploadRouter.js
│   │   └── bullBoard.js          # Bull-Board UI
│   ├── services/
│   │   ├── fileUploadService.js
│   │   ├── s3Service.js
│   │   └── constants.js
│   ├── utils/
│   │   ├── csvUtility.js
│   │   ├── date_utility.js
│   │   ├── env.js
│   │   └── errors/
│   │       └── UnprocessableError.js
│   └── utility/
│       └── s3_utility.js
├── test/
│   ├── bullui.test.js
│   ├── upload.test.js
│   ├── upload_success.test.js
│   └── fixtures/
│       └── sample.csv
├── .env.example
├── package.json
└── README.md
```


### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | — | Set to `test` for test mode |
| `DB_PSQL_USERNAME` | `user` | PostgreSQL username |
| `DB_PSQL_PASSWORD` | `password` | PostgreSQL password |
| `DB_PSQL_DATABASE` | `dbname` | Database name |
| `DB_PSQL_PORT` | `5432` | PostgreSQL port |
| `DB_PG_PRIMARY` | `127.0.0.1` | PostgreSQL host |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `AWS_ACCESS_KEY_ID` | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key |
| `AWS_REGION` | — | AWS region |
| `AWS_BUCKET_NAME` | — | S3 bucket name |
| `BULLUI_USER` | `admin` | Bull-Board username |
| `BULLUI_PASS` | `password` | Bull-Board password |

---

## 🚀 Deployment

### Using Docker (Optional)

See `docker-compose.yml` for a complete local development setup with PostgreSQL and Redis.

```bash
docker-compose up -d
npm install
npm run db:migrate
npm run dev
```

### Error Handling

Failed jobs automatically retry with exponential backoff (5s initial, 30s max).

View failed jobs in the Bull-Board dashboard and manually retry or discard them.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Commit with clear messages: `git commit -am "Add: feature description"`
5. Push and open a pull request

**PR Requirements:**
- Tests pass: `npm test`
- Clear description of changes
- Follow existing code style

---

## 📚 Resources

- [BullMQ Docs](https://docs.bullmq.io)
- [Bull-Board Repository](https://github.com/felixmosh/bull-board)
- [Sequelize ORM](https://sequelize.org)
- [Express.js](https://expressjs.com)

---

**Built with ❤️ for scalable file processing**
