import { Router } from 'express';
import { uploadFileHandler } from '../services/fileProcessor';
const router = Router();

router.post('/', uploadFileHandler);

export default router;
