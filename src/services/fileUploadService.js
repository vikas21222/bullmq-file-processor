import { extname } from 'path';
import { readFile } from 'fs/promises';
import { ALLOWED_FILE_EXTENSIONS, FILE_UPLOAD_STATUSES } from './constants.js';
import { isTestEnv, isNotTestEnv } from '../utils/env.js';

// Lazy-import FileUpload model to avoid import-time DB connection in test mode
let FileUpload;

const getFileUploadModel = async () => {
  if (!FileUpload && isNotTestEnv()) {
    const module = await import('../models/fileUpload.js');
    FileUpload = module.default;
  }
  return FileUpload;
};

// Lazy-import CreateDumpTableJob to avoid import-time issues in test mode
let CreateDumpTableJob;
const getCreateDumpTableJob = async () => {
  if (!CreateDumpTableJob && isNotTestEnv()) {
    const module = await import('../jobs/createDumpTableJob.js');
    CreateDumpTableJob = module.default;
  }
  return CreateDumpTableJob;
};

// Import S3 service only in non-test environments
let s3Service;
const getS3Service = async () => {
  if (!s3Service && isNotTestEnv()) {
    const module = await import('./s3Service.js');
    s3Service = module.default;
  }
  return s3Service;
};

class FileUploadService {
  constructor(filePathOrBuffer, fileName, schemaName) {
    this.filePathOrBuffer = filePathOrBuffer;
    this.fileName = fileName;
    this.schemaName = schemaName ? String(schemaName) : '';
    this.fileType = this._getFileType(fileName);
  }

  async process(sqlTransaction = null) {
    // schemaName is optional; only CSV files are accepted for processing.
    if (isNotTestEnv()) {
      await getFileUploadModel();
      const existingFile = await this.getFileUpload(sqlTransaction);
      if (existingFile) {
        throw new Error(`File ${this.fileName} with upload type ${this.schemaName || 'default'} already exists`);
      }
    }

    if (this.fileType !== 'csv') {
      const UnprocessableError = (await import('../utils/errors/UnprocessableError.js')).default;
      throw new UnprocessableError('Only CSV files are accepted at this time (WIP for other file types).');
    }

    // Multer may provide either a memory Buffer or a local disk path.
    const fileData = Buffer.isBuffer(this.filePathOrBuffer)
      ? this.filePathOrBuffer
      : await readFile(this.filePathOrBuffer);

    // Keep tests isolated from AWS, PostgreSQL and Redis.
    if (isTestEnv()) {
      return {
        id: 1,
        filename: this.fileName,
        status: FILE_UPLOAD_STATUSES.pending,
        schema_name: this.schemaName,
        s3_location: `test://${this.fileName}`,
        s3_key: `test/${this.fileName}`,
        file_type: this.fileType,
      };
    }

    const s3 = await getS3Service();
    const { s3Location, s3Key } = await s3.uploadFileToS3(
      this.fileName,
      fileData,
      this.schemaName.toLowerCase(),
    );

    const FileUploadModel = await getFileUploadModel();
    const newFileUpload = await FileUploadModel.create({
      filename: this.fileName,
      // The queue processor claims only pending uploads. The worker changes
      // the status to processing after it has successfully claimed the row.
      status: FILE_UPLOAD_STATUSES.pending,
      schema_name: this.schemaName,
      s3_location: s3Location,
      s3_key: s3Key,
      file_type: this.fileType,
    }, {
      returning: true,
      transaction: sqlTransaction,
    });

    try {
      const CreateDumpJob = await getCreateDumpTableJob();
      const job = new CreateDumpJob();
      await job.add({ fileUploadId: newFileUpload.id });
    } catch (error) {
      // Do not leave an upload pending forever if Redis/queue submission fails.
      await newFileUpload.update({
        status: FILE_UPLOAD_STATUSES.failed,
        error_message: `Unable to enqueue file for processing: ${error.message}`,
      }, { transaction: sqlTransaction });
      throw error;
    }

    return newFileUpload;
  }

  async getFileUpload(sqlTransaction = null) {
    const FileUploadModel = await getFileUploadModel();
    const where = { filename: this.fileName };
    if (this.schemaName) where.schema_name = this.schemaName;

    return FileUploadModel.findOne({
      where,
      transaction: sqlTransaction,
    });
  }

  _getFileType(filename) {
    if (!filename) return null;
    const ext = extname(filename).toLowerCase().replace(/^\./, '');
    switch (ext) {
      case 'csv':
        return 'csv';
      default:
        return ext || 'document';
    }
  }
}

export default FileUploadService;
