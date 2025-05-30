import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';

import CreateRtaDumpRowsJob from '../../lib/jobs/create_rta_dump_rows_job.js';
import { extname } from 'path';
import { readFile } from 'fs/promises';
import s3Utility from '../utils/s3Utility.js';

export const ALLOWED_FILE_EXTENSIONS = {
  'BSE_SCHEME': ['xlsx', 'dbf', 'csv']
  //more can be added 
 
};

class FileUploadService {
  constructor(filePath, fileName, schemaName) {
    this.filePath = filePath;
    this.fileName = fileName;
    this.schemaName = schemaName;
    this.fileType = this._getFileType(fileName);
  }

 
  async process(sqlTransaction = null) {
    const existingFile = await this.getFileUpload(sqlTransaction);

    if (existingFile) {
      throw new Error(`File ${this.fileName} with upload type ${this.schemaName} already exists`);
    }

    const fileData = await readFile(this.filePath);
    const { s3Location, s3Key } = await s3Utility.upload(
      this.fileName,
      fileData,
      this.schemaName.toLowerCase(),
    );

    const dateUploaded = new Date();
    dateUploaded.setHours(0, 0, 0, 0);

    const newFileUpload = await FileUpload.create({
      filename: this.fileName,
      date_uploaded: dateUploaded,
      status: FILE_UPLOAD_STATUSES.pending,
      schema_name: this.schemaName,
      s3_location: s3Location,
      s3_key: s3Key,
      file_type: this.fileType,
    }, {
      returning: true,
      transaction: sqlTransaction
    });

    const job = new CreateRtaDumpRowsJob();
    await job.add({fileUploadId:newFileUpload.id});

    return newFileUpload;
  }

  /**
   * @param {*} sqlTransaction
   * @returns {Promise<any>}
   */
  async getFileUpload(sqlTransaction = null) {
    return FileUpload.findOne({
      where: {
        filename: this.fileName,
        schema_name: this.schemaName
      },
      transaction: sqlTransaction
    });
  }


  _getFileType(filename) {
    const fileExtension = extname(filename).toLowerCase();

    let fileType;
    switch (fileExtension) {
      case '.dbf':
        fileType = 'dbf';
        break;
      case '.xlsx':
        fileType = 'excel';
        break;
      case '.csv':
        fileType = 'csv';
        break;
      default:
        fileType = null;
        break;
    }

    return fileType;
  }
};


export default FileUploadService;
