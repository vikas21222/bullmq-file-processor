import { unlink, writeFile } from 'fs/promises';

import { DBFFile } from 'dbffile';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { LogFactory } from '../../lib/logger.js';
import S3Utility from '../utility/s3_utility.js';
import { join } from 'path';
import secrets from '../../config/secrets.js';
import { tmpdir } from 'os';

class DbfUtility {
  constructor(dateColumns = [], expectedHeaders = []) {
    this.dateColumns = dateColumns;
    this.expectedHeaders = expectedHeaders;
    this.logger = LogFactory.getLogger('DbfUtility');
  }

  async readFileFromS3(s3Key, callback) {
    try {
      const params = {
        Bucket: secrets.awsConfig.bucketName,
        Key: s3Key,
      };
      const tmpPath = join(tmpdir(), `${Date.now()}.dbf`);
      const s3Client = S3Utility.getS3Client();

      const { Body } = await s3Client.send(new GetObjectCommand(params));
      await writeFile(tmpPath, Body);
      const totalDataRowsProcessed = await this._readDbfFile(tmpPath, callback);

      await unlink(tmpPath);

      return totalDataRowsProcessed;
    } catch (error) {
      this.logger.error('Error in readFileFromS3', error);
      throw error;
    }
  }

  // * This can be directly used to read a local dbf file instead of downloading and reading dbf from S3
  async _readDbfFile(filePath, callback) {
    try {
      const BATCH_SIZE = 10000;
      let batch = [];
      const dbfFile = await DBFFile.open(filePath, { encoding: 'utf8', readMode: 'loose' });
      const headers = this._processHeaders(dbfFile.fields.map(f => f.name));

      let totalDataRowsProcessed = 0;
      for await (const record of dbfFile) {
        const rowNumber = totalDataRowsProcessed + 1;
        const processedRecord = this._processDataRow(headers, rowNumber, record);

        batch.push(processedRecord);
        totalDataRowsProcessed++;
        if (batch.length === BATCH_SIZE) {
          await callback(batch);
          batch = [];
        }
      }
      if (batch.length > 0) {
        await callback(batch);
      }

      return totalDataRowsProcessed;
    } catch (err) {
      this.logger.error('Error in _readDbfFile', err);
      throw err;
    }
  }

  _mapHeaders({ header, index }) {
    if (typeof header === 'string') {
      return header.toLowerCase().trim();
    }

    return null;
  }

  _validateHeaders(headers) {
    if (!headers.length > 0) throw new Error('No headers found');

    const missingHeaders = this.expectedHeaders.filter(header => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`Missing headers: ${missingHeaders.join(', ')}`);
    }
  }

  _processHeaders(parsedHeaders) {
    const headers = parsedHeaders.map(
      (header, index) => this._mapHeaders({ header, index })
    );

    this._validateHeaders(headers);

    return headers;
  }

  _processDataRow(headers, rowNum, rowValues) {
    const rowJson = {};

    const formattedRowValues = {};
    Object.keys(rowValues).forEach(key => {
      formattedRowValues[key.toLowerCase().trim()] = rowValues[key];
    });

    headers.forEach((header, index) => {

      if (!header) {
        return;
      }

      const cellValue = formattedRowValues[header];

      if (cellValue === undefined || cellValue === null) {
        rowJson[header] = null;

        return;
      }
      //* DATE FORMATTING IS NOT REQUIRED IN DBF FILE, DATE IS ALREADY CONVERTED TO DATE OBJ
      if (this.dateColumns.includes(header)) {
        rowJson[header] = cellValue;

        return;
      }

      rowJson[header] = String(cellValue).trim();

    });

    rowJson['row_num'] = rowNum;

    return rowJson;
  }
}

export default DbfUtility;
