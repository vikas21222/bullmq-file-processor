import { LogFactory } from '../../lib/logger.js';
import S3Utility from '../utility/s3_utility.js';
import { createReadStream } from 'fs';
import dateUtility from './date_utility.js';
import env from '../../config/env.js';

const DEFAULT_BATCH_SIZE = 1000;

class CsvUtility {
  constructor(dateColumns = [], expectedHeaders = [], batchSize = DEFAULT_BATCH_SIZE) {
    this.dateColumns = dateColumns;
    this.expectedHeaders = expectedHeaders;
    this.batchSize = batchSize;
    this.logger = LogFactory.getLogger('CsvUtility');

    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new TypeError('batchSize must be a positive integer');
    }
  }

  async readFileFromS3(s3Key, callback) {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const params = { Bucket: env.awsBucketName || env.awsBucket, Key: s3Key };
      const s3Client = S3Utility.getS3Client();
      const { Body } = await s3Client.send(new GetObjectCommand(params));
      return await this._readCsvFile(Body, callback);
    } catch (error) {
      this.logger.error('Error in readFileFromS3', error);
      throw error;
    }
  }

  async readFileFromFs(filePath, callback) {
    try {
      return await this._readCsvFile(createReadStream(filePath), callback);
    } catch (error) {
      this.logger.error('Error in readFileFromFs', error);
      throw error;
    }
  }

  // Async iteration waits for each batch callback, applying backpressure.
  async _readCsvFile(fileReadStream, callback) {
    if (!fileReadStream || typeof fileReadStream.pipe !== 'function') {
      throw new TypeError('A readable CSV stream is required');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('A batch callback is required');
    }

    let parser;
    const onSourceError = (error) => parser?.destroy(error);

    try {
      const csvModule = await import('csv-parser');
      const csvParser = csvModule.default || csvModule;
      parser = csvParser({ mapHeaders: this._mapHeaders });

      let headersValidated = false;
      parser.once('headers', (headers) => {
        try {
          this._validateHeaders(headers);
          headersValidated = true;
        } catch (error) {
          parser.destroy(error);
        }
      });

      fileReadStream.once('error', onSourceError);
      fileReadStream.pipe(parser);

      let batch = [];
      let totalDataRowsProcessed = 0;

      for await (const row of parser) {
        if (!headersValidated) {
          throw new Error('CSV headers could not be validated');
        }

        batch.push(this._processDataRow(row, totalDataRowsProcessed + 1));
        totalDataRowsProcessed += 1;

        if (batch.length >= this.batchSize) {
          const currentBatch = batch;
          batch = [];
          await callback(currentBatch);
        }
      }

      if (batch.length > 0) {
        await callback(batch);
      }

      return totalDataRowsProcessed;
    } catch (error) {
      fileReadStream.destroy?.();
      parser?.destroy();
      this.logger.error('Error in _readCsvFile', error);
      throw error;
    } finally {
      fileReadStream.removeListener('error', onSourceError);
    }
  }

  _mapHeaders({ header }) {
    return typeof header === 'string' ? header.toLowerCase().trim() : null;
  }

  _validateHeaders(headers) {
    if (!Array.isArray(headers) || headers.length === 0) {
      throw new Error('No headers found');
    }

    const emptyHeaderIndex = headers.findIndex((header) => !header);
    if (emptyHeaderIndex !== -1) {
      throw new Error(`Empty header found at column ${emptyHeaderIndex + 1}`);
    }

    const seenHeaders = new Set();
    const duplicateHeaders = new Set();
    for (const header of headers) {
      if (seenHeaders.has(header)) {
        duplicateHeaders.add(header);
      }
      seenHeaders.add(header);
    }

    if (duplicateHeaders.size > 0) {
      throw new Error(`Duplicate headers found: ${[...duplicateHeaders].join(', ')}`);
    }

    if (!Array.isArray(this.expectedHeaders) || this.expectedHeaders.length === 0) {
      return;
    }

    const missingHeaders = this.expectedHeaders.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing headers: ${missingHeaders.join(', ')}`);
    }
  }

  _processDataRow(row, rowNum) {
    const rowJson = {};

    for (const header in row) {
      if (!header) continue;

      const cellValue = row[header];
      if (cellValue === undefined || cellValue === null || cellValue === '') {
        rowJson[header] = null;
        continue;
      }

      if (this.dateColumns.includes(header) && typeof cellValue === 'string') {
        try {
          const converted = dateUtility.convertDateFormat(cellValue);
          const parsedDate = converted ? new Date(converted) : null;
          rowJson[header] = parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate
            : null;
        } catch (error) {
          this.logger.warn(`Failed to parse date for header ${header}: ${cellValue}`);
          rowJson[header] = null;
        }
        continue;
      }

      rowJson[header] = String(cellValue).trim();
    }

    rowJson.row_num = rowNum;
    return rowJson;
  }
}

export default CsvUtility;
