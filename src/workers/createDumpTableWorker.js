import { BaseWorker } from './baseWorker.js';
import { JobProgressTracker } from './jobProgressTracker.js';
import FileUpload, { FILE_UPLOAD_STATUSES } from '../models/fileUpload.js';
import BscDumpRow from '../models/bscDumpRows.js';
import CsvUtility from '../utils/csvUtility.js';
import { LogFactory } from '../../lib/logger.js';

const logger = LogFactory.getLogger('CreateDumpTableWorker');

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

/**
 * CreateDumpTableWorker - Isolated worker for CSV parsing and dump table creation
 * 
 * This worker:
 * - Parses CSV files from S3
 * - Validates and maps data fields
 * - Inserts rows into the dump table
 * - Tracks progress for long-running jobs
 * - Handles retries with exponential backoff
 */
class CreateDumpTableWorker extends BaseWorker {
  constructor() {
    super({
      queueName: 'create-dump-table-queue',
      workerName: 'CreateDumpTableWorker',
      concurrency: 2, // Process 2 jobs concurrently
    });
  }

  async processJob(job) {
    const { fileUploadId } = job.data;
    const progress = new JobProgressTracker(job, {
      minUpdateInterval: 500, // Update every 500ms max
    });

    // Add milestones for tracking
    progress.addMilestone('file-found', 10);
    progress.addMilestone('csv-ready', 20);
    progress.addMilestone('parsing-started', 30);
    progress.addMilestone('rows-processed', 90);
    progress.addMilestone('finalizing', 95);

    try {
      // 0% - Starting
      await progress.update('Starting CSV processing...');
      logger.info(`Starting CSV processing for file upload ID: ${fileUploadId}`);

      // Fetch file upload metadata
      const fileUpload = await FileUpload.findOne({
        where: { id: fileUploadId },
      });

      if (!fileUpload) {
        throw new Error(`Cannot find file upload with ID: ${fileUploadId}`);
      }

      // 10% - File found
      await progress.reachMilestone('file-found');
      logger.info(`Found file: ${fileUpload.filename}, schema: ${fileUpload.schema_name}`);

      // Prepare CSV utility with schema-specific configuration
      const dateColumns = DATE_COLUMNS[fileUpload.schema_name] || [];
      const fieldMapper = ROWS_MODEL_FIELD_MAPPER[fileUpload.schema_name] || null;

      const csvUtility = new CsvUtility(dateColumns, Object.keys(fieldMapper || {}));

      // 20% - CSV ready
      await progress.reachMilestone('csv-ready');

      // 30% - Parsing started
      await progress.reachMilestone('parsing-started');

      // Parse CSV and insert rows
      let totalRowsProcessed = 0;
      let batchCount = 0;
      const ROWS_PER_BATCH = 1000;

      const processBatch = async (rows) => {
        batchCount++;
        try {
          // Map and validate rows
          const mappedRows = rows.map((row) => {
            const mappedRow = {};
            if (fieldMapper) {
              Object.entries(fieldMapper).forEach(([dbField, csvField]) => {
                mappedRow[dbField] = row[csvField] !== undefined ? row[csvField] : null;
              });
            } else {
              // No mapper: use as-is
              Object.assign(mappedRow, row);
            }
            return mappedRow;
          });

          // Bulk insert into dump table
          await BscDumpRow.bulkCreate(mappedRows, {
            ignoreDuplicates: true,
          });

          totalRowsProcessed += rows.length;

          // Calculate progress: 30% + (rows / estimated_total * 60%)
          const estimatedProgress = 30 + Math.min((totalRowsProcessed / 10000) * 60, 60);
          progress.currentProgress = estimatedProgress;
          await progress.update(
            `Processed ${batchCount} batches (${totalRowsProcessed} rows)`
          );

          logger.info(
            `Processed batch ${batchCount}: ${rows.length} rows (total: ${totalRowsProcessed})`
          );
        } catch (error) {
          logger.error(`Error processing batch ${batchCount}`, {
            error: error.message,
            batch: batchCount,
          });
          throw error;
        }
      };

      // Read and process CSV file
      await csvUtility.readFileFromS3(fileUpload.s3_key, processBatch);

      // 90% - Rows processed
      await progress.reachMilestone('rows-processed');

      // 95% - Finalizing
      await progress.reachMilestone('finalizing');

      // Update file status to completed
      await FileUpload.update(
        { status: FILE_UPLOAD_STATUSES.completed },
        { where: { id: fileUploadId } }
      );

      // 100% - Complete
      await progress.complete(
        `✅ Successfully processed ${totalRowsProcessed} rows`
      );

      logger.info(`✅ Successfully processed ${totalRowsProcessed} rows for file ID: ${fileUploadId}`);

      return {
        success: true,
        fileUploadId,
        totalRowsProcessed,
        message: `Processed and inserted ${totalRowsProcessed} rows`,
      };
    } catch (error) {
      logger.error(`❌ Job failed for file upload ID: ${fileUploadId}`, {
        error: error.message,
        stack: error.stack,
      });

      // Mark file as failed
      try {
        await FileUpload.update(
          { status: FILE_UPLOAD_STATUSES.failed },
          { where: { id: fileUploadId } }
        );
      } catch (updateError) {
        logger.error('Failed to update file status', { error: updateError.message });
      }

      // Re-throw the error so BullMQ can retry
      throw error;
    }
  }
}

export default CreateDumpTableWorker;
