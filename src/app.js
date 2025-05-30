import express, { json } from 'express';

import multer from 'multer';
import uploadRoute from './routes/upload';

const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(json());
app.use('/upload', upload.single('file'), uploadRoute);

app.listen(3000, () => console.log('Server running on port 3000'));
