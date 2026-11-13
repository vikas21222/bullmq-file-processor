# BullMQ File Processing Pipeline 🚀

A Node.js asynchronous file-processing pipeline built with Express, BullMQ, Redis, AWS S3, Sequelize, and PostgreSQL.

## Current features

- CSV upload API with S3 storage and PostgreSQL upload tracking.
- Background processing through BullMQ.
- Streaming CSV parsing instead of loading the complete file into memory.
- Sequential batch callbacks (default: 1,000 rows per batch) with stream backpressure.
- Configurable date conversion and required-header validation.
- Queue monitoring UI at /bullui, protected with HTTP Basic Auth.

> Excel and DBF uploads are not supported yet. The upload API currently accepts CSV files only.

## Tech stack

- Node.js + Express
- PostgreSQL + Sequelize
- BullMQ + Redis
- AWS S3
- Multer
- csv-parser

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL
- Redis
- AWS S3 credentials for S3 uploads

## Quickstart

1. Install dependencies:

\`\`\`bash
npm install
\`\`\`

2. Copy and configure environment variables:

\`\`\`bash
cp .env.example .env
# Configure database, Redis and AWS S3 settings in .env
\`\`\`

3. Run database migrations:

\`\`\`bash
npm run db:migrate
\`\`\`

4. Start the application:

\`\`\`bash
npm start
# or
npm run dev
\`\`\`

## API

Upload a CSV file using multipart form data. The file field is required; upload_type is optional.

- **Method:** POST
- **Path:** /upload
- **Content-Type:** multipart/form-data

Example:

\`\`\`bash
curl -F "file=@/path/to/data.csv" \\
     -F "upload_type=bse_scheme" \\
     http://localhost:3000/upload
\`\`\`

## CSV processing behaviour

- The parser reads from the S3 readable stream.
- Rows are consumed asynchronously and passed to the database callback in batches.
- The default batch size is 1,000 rows. It can be overridden when constructing CsvUtility.
- The next batch is not consumed until the current callback finishes. This provides backpressure when database writes are slower than file parsing.
- Stream, parsing, header-validation, and batch callback errors are propagated to the job processor.

## Queue UI

- URL: http://localhost:3000/bullui
- Configure BULLUI_USER and BULLUI_PASS in .env.
- Change default credentials before deploying.

## Database migrations

\`\`\`bash
npm run db:migrate
npm run db:migrate:undo
\`\`\`

## Tests

Run the automated Jest + Supertest suite:

\`\`\`bash
npm test
\`\`\`

## Useful scripts

- npm start — start the API application
- npm run dev — start the application with nodemon
- npm test — run tests
- npm run db:migrate — apply Sequelize migrations
- npm run db:migrate:undo — undo the last migration
- npm run worker:csv — start the standalone CSV worker process

## Development

- Application source is under src/.
- Queue processors are under src/queuesProcessors/.
- Jobs are under src/jobs/.
- Worker processes are under src/workers/.

## Security

- Never commit real credentials. Keep secrets in environment variables or a secrets manager.
- Protect the Bull Board UI with non-default credentials.
- Keep .env out of version control.

## Contributing

Open a pull request with a clear description and tests for new behaviour.

## License

ISC
