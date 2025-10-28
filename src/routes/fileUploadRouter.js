import { ALLOWED_FILE_EXTENSIONS } from '../services/fileUploadService.js';
import FileUploadController from '../controller/fileUploadController.js';
import express from 'express';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extname = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extname);
  }
});
const fileFilter = (req, file, cb) => {
  const { upload_type: uploadType } = req.body;
  const validUploadTypes = ALLOWED_FILE_EXTENSIONS[uploadType];
  const extname = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (!validUploadTypes) {
    return cb(new UnprocessableError(
      `Invalid upload type. Only ${Object.keys(ALLOWED_FILE_EXTENSIONS).join(', ')} are allowed.`
    ));
  }
  if (!validUploadTypes.includes(extname)) {
    return cb(new UnprocessableError(
      `Invalid file type. Only ${validUploadTypes.join(', ')} files are allowed.`
    ));
  }

  cb(null, true);
};
const uploadSingle = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1,
  },
  fileFilter: fileFilter
});

const fileUploadRouter = express.Router();
const controller = new FileUploadController();
fileUploadRouter.get('/', controller.index);
fileUploadRouter.post('/upload', uploadSingle.single('file'), controller.create);

export default s2sFileRouter;
