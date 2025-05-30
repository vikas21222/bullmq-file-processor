import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { unlink, writeFile } from 'fs/promises';

import { DBFFile } from 'dbffile';
import ExcelJS from 'exceljs';
import { LogFactory } from '../../lib/logger.js';
import appConfig from '../../config/env.js';
import csvParser from 'csv-parser';
import fs from 'fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import os from 'os';
import path from 'path';
import secrets from '../../config/secrets.js';

class FileServiceUtility {
    constructor(parameters) {
        
    }

   
  /**
 * @param {string} filePath
 * @param {*} bucketName
 * @param {*} processCallback
 * @returns {Promise<void>}
 */
  async readDbfFileFromS3(s3Key, bucketName = null, processCallback) {
    try {
      const batchSize = 10000;
      let batch = [];
      bucketName = bucketName || secrets.awsConfig.bucketName;
      const params = {
        Bucket: bucketName,
        Key: s3Key,
      };
      const tmpPath = path.join(os.tmpdir(), `${Date.now()}.dbf`);
      const s3 = this.getS3Client(bucketName);
      const response = await s3.send(new GetObjectCommand(params));
      await writeFile(tmpPath, response.Body);
      const dbfFile = await DBFFile.open(tmpPath, { encoding: 'utf8', readMode: 'loose' });

      for await (const record of dbfFile) {
        batch.push(record);
        if (batch.length === batchSize) {
          await processCallback(batch);
          batch = [];
        }
      }
      if (batch.length > 0) {
        await processCallback(batch);
      }

      await unlink(tmpPath);
    } catch (err) {
      LogFactory.getLogger().error(err);
      throw err;
    }
  }

  /**
   * @param {string} filePath
   * @param {*} bucketName
   * @param {*} processCallback
   * @returns {Promise<void>}
   */
  async readDbfFileFromFs(filePath, bucketName = null, processCallback) {
    try {
      const batchSize = 10000;
      let batch = [];
      const dbfFile = await DBFFile.open(filePath, { encoding: 'utf8', readMode: 'loose' });

      for await (const record of dbfFile) {
        batch.push(record);
        if (batch.length === batchSize) {
          await processCallback(batch);
          batch = [];
        }
      }
      if (batch.length > 0) {
        await processCallback(batch);
      }
    } catch (err) {
      LogFactory.getLogger().error(err);
      throw err;
    }
  }


  async readXlsxFileFromS3(s3Key, processBatch, headerCount = 1) {
    try {
      const params = {
        Bucket: secrets.awsConfig.bucketName,
        Key: s3Key,
      };
      const s3 = this.getS3Client();
      const { Body } = await s3.send(new GetObjectCommand(params));

      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(Body, {
        includeEmpty: true,
        includeFormats: true,
      });

      let headers = [];
      let rowCount = 0;
      let excelRowsProcessedCount = 0;

      for await (const worksheetReader of workbookReader) {
        let batch = [];

        for await (const row of worksheetReader) {
          const rowNum = row.number;
          let rowValues = row.values;
          if (rowValues[0] === null) {
            rowValues.shift();
          }

          if (rowCount < headerCount) {
            rowValues.forEach((value, index) => {
              if (value) {
                headers[index] = value;
              }
            });
            rowCount++;
            continue;
          }

          let rowJson = {};
          headers.forEach((header, index) => {
            let cellValue = rowValues[index];
            rowJson[header] = String(cellValue);
          });

          if (Object.keys(rowJson).length > 0) {
            excelRowsProcessedCount++;
            rowJson['row_num'] = rowNum;
            batch.push(rowJson);
          }

          if (batch.length >= 10000) {
            await processBatch(batch);
            batch = [];
          }
        }

        if (batch.length > 0) {
          await processBatch(batch);
        }

        break;
      }

      return excelRowsProcessedCount;
    } catch (error) {
      LogFactory.getLogger().error(`Error in readXlsxFileFromS3: ${error}`);
      throw error;
    }
  }
  // this is for reading a local excel file instead of downloading and reading excel from S3
  async readXlsxFileFromFs(path, callback) {
    try {
      // const workbookReader = xlsx.readFile(path, {
      //   includeEmpty: true,
      //   includeFormats: true,
      // });
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(path, {
        includeEmpty: true,
        includeFormats: true,
      });

      let hasReadHeader = false;
      let headers = [];
      let excelRowsProcessedCount = 0;
      for await (const worksheetReader of workbookReader) {
        let batch = [];

        for await (const row of worksheetReader) {
          const rowNum = row.number;
          let rowValues = row.values;
          // Unconditionally remove the first element, which is consistently null
          if (rowValues[0] === null) {
            rowValues.shift();
          }

          // Log the adjusted values
          console.log(`Adjusted Row values: ${JSON.stringify(rowValues)}`);

          if (!hasReadHeader) {
            headers = rowValues;
            hasReadHeader = true;
            continue;
          }

          let rowJson = {};
          headers.forEach((header, index) => {
            let cellValue = rowValues[index];
            rowJson[header] = cellValue;
          });

          if (Object.keys(rowJson).length > 0) {
            excelRowsProcessedCount++;
            rowJson['row_num'] = rowNum;
            batch.push(rowJson);
          }

          if (batch.length >= 10000) {
            await callback(batch);
            batch = [];
          }
        }

        if (batch.length > 0) {
          await callback(batch);
        }

        // Break after processing the first sheet
        break;
      }

      return excelRowsProcessedCount;
    } catch (err) {
      LogFactory.getLogger().error('Error in readXlsxFileFromFs', err);
      throw err;
    }
  }


  // Read CSV file from S3
  async readCsvFileFromS3(s3Key, processBatch, headerCount = 1) {
    try {
      const params = {
        Bucket: secrets.awsConfig.bucketName,
        Key: s3Key,
      };
      const s3 = this.getS3Client();
      const { Body } = await s3.send(new GetObjectCommand(params));

      return new Promise((resolve, reject) => {
        let headers = [];
        let rowCount = 0;
        let csvRowsProcessedCount = 0;
        let batch = [];

        Body.pipe(csvParser())
          .on('headers', (parsedHeaders) => {
            if (rowCount < headerCount) {
              headers = parsedHeaders;
              rowCount++;
            }
          })
          .on('data', (row) => {
            if (rowCount < headerCount) {
              rowCount++;
              return;
            }

            csvRowsProcessedCount++;
            row['row_num'] = csvRowsProcessedCount;
            batch.push(row);

            if (batch.length >= 10000) {
              processBatch(batch);
              batch = [];
            }
          })
          .on('end', async () => {
            if (batch.length > 0) {
              await processBatch(batch);
            }
            resolve(csvRowsProcessedCount);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      LogFactory.getLogger().error(`Error in readCsvFileFromS3: ${error}`);
      throw error;
    }
  }

  // Read CSV file from local file system
  async readCsvFileFromFs(filePath, processBatch) {
    try {
      return new Promise((resolve, reject) => {
        let headers = [];
        let csvRowsProcessedCount = 0;
        let batch = [];
        let hasReadHeader = false;

        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('headers', (parsedHeaders) => {
            if (!hasReadHeader) {
              headers = parsedHeaders;
              hasReadHeader = true;
            }
          })
          .on('data', (row) => {
            csvRowsProcessedCount++;
            row['row_num'] = csvRowsProcessedCount;
            batch.push(row);

            if (batch.length >= 10000) {
              processBatch(batch);
              batch = [];
            }
          })
          .on('end', async () => {
            if (batch.length > 0) {
              await processBatch(batch);
            }
            resolve(csvRowsProcessedCount);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      LogFactory.getLogger().error('Error in readCsvFileFromFs', error);
      throw error;
    }
  }
  

  

}

export default FileServiceUtility;