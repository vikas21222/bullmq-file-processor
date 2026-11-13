import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';

import BaseJob from './baseJob.js';
import BscDumpRow, { BSE_DUMP_ROW_STATUSES } from '../models/bscDumpRows.js';
import CsvUtility from '../utils/csvUtility.js';
import { validateBsc200Row } from '../utils/bsc200RowValidator.js';

const ROWS_MODEL_FIELD_MAPPER = {
  'BSC200': {
    broker_code: 'brcode',
    bsc_scheme_code: 'scheme_code',
    min_amount: 'min_amount',
    reg_date: 'reg_date'
  },
};

const DATE_COLUMNS = {
  'BSC200': ['reg_date', 'from_date', 'to_date'],
};

class CreateDumpTableJob extends BaseJob {
  constructor() {
    super({
      queueName: 'create-dump-table-queue',
      jobOptions: {
        delay: 5000,
        attempts: 1,
      },
    });
  }

  async process(data) {
    const { fileUploadId } = data;

    this.fileUpload = await FileUpload.findOne({
      where: {
        id: fileUploadId,
        status: FILE_UPLOAD_STATUSES.pending,
      },
    });

    if (!this.fileUpload) throw new Error(`cannot find fileUploadId: ${fileUploadId}`);

    this.dateColumns = DATE_COLUMNS[this.fileUpload.schema_name] || [];
    this.fieldMapper = ROWS_MODEL_FIELD_MAPPER[this.fileUpload.schema_name] || null;

    await FileUpload.update(
      { status: FILE_UPLOAD_STATUSES.processing },
      { where: { id: fileUploadId } }
    );

    const expectedHeaders = this.fieldMapper ? Object.values(this.fieldMapper) : [];
    let totalDataRowsProcessed = 0;

    if (this.fileUpload.file_type === 'csv') {
      const csvUtility = new CsvUtility(this.dateColumns, expectedHeaders);
      totalDataRowsProcessed = await csvUtility.readFileFromS3(
        this.fileUpload.s3_key,
        this.bulkCreateDumpTable.bind(this)
      );
    } else {
      const singleRecord = {
        row_num: 1,
        file_name: this.fileUpload.filename,
        s3_key: this.fileUpload.s3_key,
        s3_location: this.fileUpload.s3_location,
      };
      await this.bulkCreateDumpTable([singleRecord]);
      totalDataRowsProcessed = 1;
    }

    // Count both pending and failed rows: invalid rows are persisted too, so
    // they must be included when reconciling the parsed CSV row count.
    const totalRecordsInDb = await BscDumpRow.count({
      where: { request_id: fileUploadId },
      useMaster: true
    });

    if (totalRecordsInDb !== totalDataRowsProcessed) {
      throw new Error(`rows in uploaded file and ${BscDumpRow?.getTableName()} table do not match`);
    }

    await FileUpload.update(
      { status: FILE_UPLOAD_STATUSES.completed },
      { where: { id: fileUploadId } }
    );
  }

  async bulkCreateDumpTable(batch) {
    try {
      const attributes = batch.map((row) => {
        const mappedRecord = {};

        if (this.fieldMapper) {
          for (const commonField in this.fieldMapper) {
            const uploadField = this.fieldMapper[commonField];
            mappedRecord[commonField] = row[uploadField];
          }
        }

        const validationErrors = this.fileUpload.schema_name === 'BSC200'
          ? validateBsc200Row(row)
          : [];
        const isInvalid = validationErrors.length > 0;

        return {
          ...mappedRecord,
          request_id: this.fileUpload.id,
          request_type: this.fileUpload.file_type,
          request_schema: this.fileUpload.schema_name || this.fileUpload.file_type,
          row_num: row.row_num,
          status: isInvalid ? BSE_DUMP_ROW_STATUSES.FAILED : BSE_DUMP_ROW_STATUSES.PENDING,
          remarks: isInvalid ? validationErrors.join('; ') : null,
          raw_data: row.raw_data || row,
        };
      });

      await BscDumpRow.bulkCreate(attributes, { ignoreDuplicates: true });
    } catch (err) {
      this.logger.error('error in process', err);
      throw err;
    }
  }

  async onJobFailed(job) {
    try {
      const { fileUploadId } = job.data;
      if (job.attemptsMade < job.opts.attempts) {
        this.logger.info(`attempt ${job.attemptsMade} job ${job.id}`);

        await FileUpload.update(
          { status: FILE_UPLOAD_STATUSES.pending },
          { where: { id: fileUploadId } }
        );

        return;
      }

      await FileUpload.update(
        {
          status: FILE_UPLOAD_STATUSES.failed,
          error_message: `${this.queueName} job failed: ${job.failedReason}`,
          is_processing: false
        },
        { where: { id: fileUploadId } }
      );
    } catch (error) {
      this.logger.error('Error occurred in _workerFailedEventHandler:', error);
    }
  }
}

export default CreateDumpTableJob;
