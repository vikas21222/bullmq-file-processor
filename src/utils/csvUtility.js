import { GetObjectCommand } from '@aws-sdk/client-s3';
import { LogFactory } from '../../lib/logger.js';
import S3Utility from '../utility/s3_utility.js';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import dateUtility from './date_utility.js';
import secrets from '../../config/secrets.js';

class CsvUtility {
  constructor(dateColumns = [], expectedHeaders = []) {
    this.dateColumns = dateColumns;
    this.expectedHeaders = expectedHeaders;
    this.logger = LogFactory.getLogger('CsvUtility');
  }

  async readFileFromS3(s3Key, callback) {
    try {
      const params = {
        Bucket: secrets.awsConfig.bucketName,
        Key: s3Key,
      };
      const s3Client = S3Utility.getS3Client();

      const { Body } = await s3Client.send(new GetObjectCommand(params));

      const totalDataRowsProcessed = await this._readCsvFile(Body, callback);

      return totalDataRowsProcessed;
    } catch (error) {
      this.logger.error('Error in readFileFromS3', error);
      throw error;
    }
  }

  async readFileFromFs(s3Key, callback) {
    try {
      const totalDataRowsProcessed = await this._readCsvFile(createReadStream(s3Key), callback);

      return totalDataRowsProcessed;
    } catch (error) {
      this.logger.error('Error in readFileFromS3', error);
      throw error;
    }
  }

  // * This can be directly used to read a local csv file instead of downloading and reading csv from S3
  async _readCsvFile(fileReadStream, callback) {
    try {
      const BATCH_SIZE = 10000;
      let batch = [];
      let totalDataRowsProcessed = 0;
      const headerCount = 1;

      return new Promise((resolve, reject) => {
        fileReadStream.pipe(csvParser({
          mapHeaders: this._mapHeaders
        }))
          .on('headers', (headers) => {
            try {
              this._validateHeaders(headers);
            } catch (err) {
              reject(err);
            }
          })
          .on('data', async (row) => {
            const rowNumber = totalDataRowsProcessed + 1;
            const processedRow = this._processDataRow(row, rowNumber);
            batch.push(processedRow);
            totalDataRowsProcessed++;
            if (batch.length >= BATCH_SIZE) {
              await callback(batch);
              batch = [];
            }
          })
          .on('end', async () => {
            if (batch.length > 0) {
              await callback(batch);
            }
            resolve(totalDataRowsProcessed);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (err) {
      this.logger.error('Error in _readCsvFile', err);
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

  _processDataRow(row, rowNum) {
    const rowJson = {};
    for (const header in row) {

      if (!header) {
        continue;
      }

      const cellValue = row[header];

      if (cellValue === undefined || cellValue === null) {
        rowJson[header] = null;

        continue;
      }

      if (this.dateColumns.includes(header) && typeof cellValue === 'string') {
        // * input format of date is dd/mm/yyyy, typeof string
        rowJson[header] = new Date(dateUtility.convertDateFormat(cellValue));

        continue;
      }

      rowJson[header] = String(cellValue).trim();
    }
    rowJson['row_num'] = rowNum;

    return rowJson;
  }
}

export default CsvUtility;
