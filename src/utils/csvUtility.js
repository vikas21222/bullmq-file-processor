import { LogFactory } from '../../lib/logger.js';
import S3Utility from '../utility/s3_utility.js';
import { createReadStream } from 'fs';
// `csv-parser` is imported lazily inside `_readCsvFile` to avoid requiring it at
// module load time (prevents test/CI failures when the package isn't installed).
import dateUtility from './date_utility.js';
import env from '../../config/env.js';

class CsvUtility {
  constructor(dateColumns = [], expectedHeaders = []) {
    this.dateColumns = dateColumns;
    this.expectedHeaders = expectedHeaders;
    this.logger = LogFactory.getLogger('CsvUtility');
  }

  async readFileFromS3(s3Key, callback) {
    try {
      // lazy import AWS SDK to avoid requiring it at module import time
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');

      const params = {
        Bucket: env.awsBucketName || env.awsBucket || env.awsBucketName,
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

      return new Promise(async (resolve, reject) => {
        // lazy-import csv-parser so tests that don't need actual parsing won't fail
        let csvParser;
        try {
          const csvModule = await import('csv-parser');
          csvParser = csvModule.default || csvModule;
        } catch (e) {
          return reject(new Error('csv-parser is required to parse CSV files'));
        }

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

    // If no expected headers are provided, skip strict validation
    if (!Array.isArray(this.expectedHeaders) || this.expectedHeaders.length === 0) return;

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
        // * input formats supported: dd/mm/yyyy, d/m/yyyy, yyyy-mm-dd, etc.
        try {
          const converted = dateUtility.convertDateFormat(cellValue);
          if (!converted) {
            rowJson[header] = null;
          } else {
            const d = new Date(converted);
            if (Number.isNaN(d.getTime())) {
              rowJson[header] = null;
            } else {
              rowJson[header] = d;
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to parse date for header ${header}: ${cellValue}`);
          rowJson[header] = null;
        }

        continue;
      }

      rowJson[header] = String(cellValue).trim();
    }
    rowJson['row_num'] = rowNum;

    return rowJson;
  }
}

export default CsvUtility;
