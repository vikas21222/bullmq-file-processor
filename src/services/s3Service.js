// Mock S3 upload function
exports.uploadToS3 = async (file) => {
  return `s3://your-bucket/${file.filename}`;
};
