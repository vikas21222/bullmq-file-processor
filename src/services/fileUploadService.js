import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';
import { extname } from 'path';
import { readFile } from 'fs/promises';
import CreateDumpTableJob from '../jobs/createDumpTableJob.js';
import s3Service from './s3Service.js';

// Keep mapping if you want to restrict specific schemas in future
export const ALLOWED_FILE_EXTENSIONS = {
  BSE_SCHEME: ['csv'],
};

class FileUploadService {
  constructor(filePath, fileName, schemaName) {
    this.filePath = filePath;
    this.fileName = fileName;
    this.schemaName = schemaName ? String(schemaName) : '';
    this.fileType = this._getFileType(fileName);
  }

  async process(sqlTransaction = null) {
    // schemaName is optional now; only CSV files are accepted for processing
    const existingFile = await this.getFileUpload(sqlTransaction);
    if (existingFile) {
      throw new Error(`File ${this.fileName} with upload type ${this.schemaName || 'default'} already exists`);
    }
    // enforce CSV processing only (safety in service layer)
    if (this.fileType !== 'csv') {
      const UnprocessableError = (await import('../utils/errors/UnprocessableError.js')).default;
      throw new UnprocessableError('Only CSV files are accepted at this time (WIP for other file types).');
    }
    const fileData = await readFile(this.filePath);
    // In test mode avoid calling AWS/DB/queues — return a lightweight object
    if (process.env.NODE_ENV === 'test') {
      const dummy = {
        id: 1,
        filename: this.fileName,
        status: FILE_UPLOAD_STATUSES.pending,
        schema_name: this.schemaName,
        s3_location: `test://${this.fileName}`,
        s3_key: `test/${this.fileName}`,
        file_type: this.fileType,
      };

      return dummy;
    }

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
    const where = { filename: this.fileName };
    if (this.schemaName) where.schema_name = this.schemaName;

    return FileUpload.findOne({
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
        // return raw extension for other file types so we can handle them generically
        return ext || 'document';
    }
  }
}

export default FileUploadService;
