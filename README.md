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

## 📂 Folder Structure

See [`src/`](./src) for modular code organization.

## 🧪 How to Run

```bash
npm install
cp .env.example .env
# configure S3, DB and Redis credentials in .env

npm run dev
