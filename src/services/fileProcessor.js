const { uploadToS3 } = require('./s3Service');
const { Tracking } = require('../models/fileUpload');
const queue = require('../queues').default;

exports.uploadFileHandler = async (req, res) => {
  const file = req.file;
  const s3Path = await uploadToS3(file);
  await Tracking.create({
    filename: file.originalname,
    type: file.mimetype,
    s3Path,
    status: 'PENDING',
  });
  await queue.add('validate-file', { s3Path });
  res.send('File uploaded and job queued.');
};
