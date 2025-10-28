import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';

import BaseJob from './baseJob.js';
import BscDumpRow from '../models/bscDumpRows.js';
import CsvUtility from '../utils/csvUtility.js';

const ROWS_MODEL_FIELD_MAPPER = {
  'BSC200': {
    broker_code: 'brcode',
    bsc_scheme_code: 'scheme_code',
    min_amount: 'min_amount',
    reg_date:'reg_date'
  },}

const DATE_COLUMNS = {

  'BSC200': ['reg_date', 'from_date', 'to_date'],
 
};

class CreateDumpTableJob extends BaseJob {
  constructor() {
    super({
      queueName: 'create-dump-table-queue',
      jobOptions: {
        delay: 5000,
        attempts: 3,
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

    this.dateColumns = DATE_COLUMNS[this.fileUpload.schema_name];
    this.fieldMapper = ROWS_MODEL_FIELD_MAPPER[this.fileUpload.schema_name];

    if (!this.fieldMapper ||!this.dateColumns ){
      throw new Error(`Unsupported upload type fileUploadId: ${fileUploadId}`);
    }


    await FileUpload.update(
      {
        status: FILE_UPLOAD_STATUSES.processing,
      },
      { where: { id: fileUploadId } }
    );


    const expectedHeaders = Object.values(this.fieldMapper);
    let totalDataRowsProcessed;
    switch (this.fileUpload.file_type) {
      case 'csv':
        const csvUtility = new CsvUtility(this.dateColumns, expectedHeaders);
        totalDataRowsProcessed = await csvUtility.readFileFromS3(this.fileUpload.s3_key, this.bulkCreateDumpTable.bind(this));
        break;
      default:
        throw new Error(`Unsupported file type: ${this.fileUpload.file_type}`);
    }

    const totalRecordsInDb = await BscDumpRow.count({
      where: {
        request_id: fileUploadId,
        status: 'pending',
      },
      useMaster: true
    });
    if (totalRecordsInDb !== totalDataRowsProcessed) {
      throw new Error(`rows in uploaded file and ${BscDumpRow?.getTableName()} table do not match`);
    }

    await FileUpload.update(
      {
        status: FILE_UPLOAD_STATUSES.completed,
      },
      { where: { id: fileUploadId } }
    );

    const jobObj = new CreateDataFeederJob();
    await jobObj.add({
      requestId: this.fileUpload.id,
      requestSchema: this.fileUpload.schema_name,
    });
  }

  async bulkCreateDumpTable(batch) {
    try {
      const attributes = batch.map(row => {
        const mappedRecord = {};

        for (const commonField in this.fieldMapper) {
          const uploadField = this.fieldMapper[commonField];
          mappedRecord[commonField] = row[uploadField];
        }

        return ({
          ...mappedRecord,
          request_id: this.fileUpload.id,
          request_schema: this.fileUpload.schema_name,
          row_num: row['row_num'],
          raw_data: row,
        });
      });

      await BscDumpRow.bulkCreate(
        attributes,
        {
          ignoreDuplicates: true,
        }
      );
    } catch (err) {
      this.logger.error('error in process', err);
      throw err;
    }
  };

  async onJobFailed(job) {
    try {
      const { fileUploadId } = job.data;
      if (job.attemptsMade < job.opts.attempts) {
        this.logger.info(`attempt ${job.attemptsMade} job ${job.id}`);

        await FileUpload.update(
          {
            status: FILE_UPLOAD_STATUSES.pending,
          },
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
