import ExcelJS from 'exceljs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Utility from './s3Utility.js';

class ExcelUtility {
  constructor(dateColumns = [], expectedHeaders = []) {
    this.dateColumns = dateColumns;
    this.expectedHeaders = expectedHeaders;
    this.logger = LogFactory.getLogger('ExcelUtility');
  }

  async readFileFromS3(s3Key, callback) {
    try {
      const s3Client = s3Utility.getS3Client();

      const params = {
        Bucket: 'your_bucket_name',// TODO ADD IN .env
        Key: s3Key,
      };
      const { Body } = await s3Client.send(new GetObjectCommand(params));
      const totalDataRowsProcessed = await this._readXlsxFile(Body, callback);

      return totalDataRowsProcessed;
    } catch (error) {
      this.logger.error('Error in readXlsxFileFromS3:', error);
      throw error;
    }
  }

  // This can be directly used to read a local excel file instead of downloading and reading excel from S3
  async _readXlsxFile(path, callback) {
    try {
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(path, {
        includeEmpty: true,
        includeFormats: true,
      });

      for await (const worksheetReader of workbookReader) {
        const totalDataRowsProcessed = await this._readWorksheet(worksheetReader, callback);

        // Return after processing the first sheet
        return totalDataRowsProcessed;
      }
    } catch (err) {
      this.logger.error('Error in _readXlsxFile', err);
      throw err;
    }
  }

  async _readWorksheet(worksheetReader, callback) {
    let headers = [];
    let excelRowsProcessedCount = 0;
    let batch = [];

    try {
      for await (const row of worksheetReader) {
        let rowNum = row.number;
        let rowValues = row.values;
        let rowJson = {};

        // Remove the first element, which is consistently null
        if (rowValues[0] === null) {
          rowValues.shift();
        }

        if (headers.length === 0) {
          headers = this._processHeaders(rowValues);
          continue;
        }

        rowJson = await this._processDataRow(headers, rowNum, rowValues);
        excelRowsProcessedCount++;
        batch.push(rowJson);

        if (batch.length >= 10000) {
          await callback(batch);
          batch = [];
        }
      }

      if (batch.length > 0) {
        await callback(batch);
      }

      return excelRowsProcessedCount;
    } catch (err) {
      this.logger.error('Error in _readWorksheet', err);
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
    const headers = parsedHeaders.map((header, index) => this._mapHeaders({ header, index }));

    this._validateHeaders(headers);

    return headers;
  }

  async _processDataRow(headers, rowNum, rowValues) {
    const  rowJson = {};

    headers.forEach((header, index) => {

      if (!header) {
        return;
      }

      const cellValue = rowValues[index];

      if (cellValue === undefined || cellValue === null) {
        rowJson[header] = null;

        return;
      }

      if (this.dateColumns.includes(header) && typeof cellValue === 'number') {
        rowJson[header] = this.excelSerialDateToJSDate(cellValue);

        return;
      }

      rowJson[header] = String(cellValue).trim();

    });

    rowJson['row_num'] = rowNum;

    return rowJson;
  }

  excelSerialDateToJSDate(serial) {
    const days = Math.round(serial - 25569);
    const seconds = days * 86400;

    return new Date(seconds * 1000);
  }
}

export default ExcelUtility;
