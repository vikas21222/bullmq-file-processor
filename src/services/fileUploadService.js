import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';
import { extname } from 'path';
import { readFile } from 'fs/promises';
import CreateDumpTableJob from '../jobs/createDumpTableJob.js';
import s3Service from './s3Service.js';

export const ALLOWED_FILE_EXTENSIONS = {
  BSE_SCHEME: ['csv'],
  // add more schemas => allowed extensions as needed
};

class FileUploadService {
  constructor(filePath, fileName, schemaName) {
    this.filePath = filePath;
    this.fileName = fileName;
    this.schemaName = schemaName ? String(schemaName) : '';
    this.fileType = this._getFileType(fileName);
  }

  async process(sqlTransaction = null) {
    if (!this.schemaName) {
      throw new Error('upload type (schemaName) is required');
    }

    const existingFile = await this.getFileUpload(sqlTransaction);
    if (existingFile) {
      throw new Error(`File ${this.fileName} with upload type ${this.schemaName} already exists`);
    }

    if (!this.fileType) {
      throw new Error(`Unsupported file extension for file: ${this.fileName}`);
    }

    // If there are explicit allowed extensions for this schema, enforce them
    const allowedForSchema = ALLOWED_FILE_EXTENSIONS[String(this.schemaName).toUpperCase()];
    if (Array.isArray(allowedForSchema) && allowedForSchema.length > 0 && !allowedForSchema.includes(this.fileType)) {
      throw new Error(`File type "${this.fileType}" is not allowed for schema "${this.schemaName}"`);
    }

    const fileData = await readFile(this.filePath);

    const { s3Location, s3Key } = await s3Service.uploadFileToS3(
      this.fileName,
      fileData,
      String(this.schemaName).toLowerCase(),
    );

    const newFileUpload = await FileUpload.create({
      filename: this.fileName,
      status: FILE_UPLOAD_STATUSES.pending,
      schema_name: this.schemaName,
      s3_location: s3Location,
      s3_key: s3Key,
      file_type: this.fileType,
    }, {
      returning: true,
      transaction: sqlTransaction,
    });

    const job = new CreateDumpTableJob();
    await job.add({ fileUploadId: newFileUpload.id });

    return newFileUpload;
  }

  async getFileUpload(sqlTransaction = null) {
    return FileUpload.findOne({
      where: {
        filename: this.fileName,
        schema_name: this.schemaName,
      },
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
        return null;
    }
  }
}

export default FileUploadService;
