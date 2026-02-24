import FileUploadController from '../controller/fileUploadController.js';
import express from 'express';
import multer from 'multer';
import path from 'path';
import UnprocessableError from '../utils/errors/UnprocessableError.js';
import { mkdirSync } from 'fs';
import { isTestEnv } from '../utils/env.js';

// use disk storage for multer; restrict to CSV uploads only
// In test mode, use memory storage to avoid file I/O
let storage;
if (isTestEnv()) {
  storage = multer.memoryStorage();
} else {
  // Try to create uploads directory if it doesn't exist
  try {
    mkdirSync('uploads/', { recursive: true });
  } catch (err) {
    console.error('Warning: could not create uploads directory:', err.message);
  }
  storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extname = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + extname);
    }
  });
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (ext !== 'csv') {
    return cb(new UnprocessableError('Only CSV files are accepted at this time (WIP for other file types).'));
  }

  cb(null, true);
};

const uploadSingle = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter,
});

const fileUploadRouter = express.Router();
const controller = new FileUploadController();
fileUploadRouter.get('/', controller.index.bind(controller));
fileUploadRouter.post('/upload', uploadSingle.single('file'), controller.create.bind(controller));

export default fileUploadRouter;
