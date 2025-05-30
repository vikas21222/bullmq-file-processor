import FileUpload, { FILE__SCHEMA_NAME } from '../models/fileUpload.js';

import FileUploadService from '../services/fileUploadService.js';
import { HttpStatusCode } from 'axios';
import { LogFactory } from '../../../lib/logger.js';
import { Op } from 'sequelize';
import s3Utility from '../utils/s3Utility.js';

class FileUploadController {
  async create(req, res, next) {
    const logger = LogFactory.getLogger('FileUploadController');
    try {
      

      const { upload_type: schemaName } = req.body;
      const uploadedFile = req.file;
      if (!schemaName) {
        throw new UnprocessableError('no upload_type found');
      }
      if (!uploadedFile) {
        throw new UnprocessableError('no file found');
      }

      const { originalname, path: filePath } = uploadedFile;

      const fileUploadService = new FileUploadService(filePath, originalname, schemaName);
      const fileUpload = await fileUploadService.process();

      return res.status(HttpStatusCode.Created).json({
        message: 'file upload successful',
        data: {
          file_upload_id: fileUpload.id
        },
        success: true,
      });
    } catch (err) {
      logger.error('error in create', err);
      next(err);
    }
  }
  async index(req, res, next) {
    const logger = LogFactory.getLogger('FileUploadControllerIndex');
    try {
      
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;
      const from = req.query.from ? new Date(req.query.from) : null;
      const to = req.query.to ? new Date(req.query.to) : null;

      if (from) {
        from.setHours(0, 0, 0, 0);
      }
      if (to) {
        to.setHours(0, 0, 0, 0);
      }
      const where = {};
      if (from && to) {
        where.date_uploaded = { [Op.between]: [from, to] };
      } else if (from) {
        where.date_uploaded = { [Op.gte]: from };
      } else if (to) {
        where.date_uploaded = { [Op.lte]: to };
      }
      if (req.query.status) {
        where.status = req.query.status;
      }
      if (req.query.upload_type) {
        where.upload_type = { [Op.in]: [req.query.upload_type] };
      }
      // Fetch files based on the where clause, page, and limit
      const { count, rows: files } = await FileUpload.findAndCountAll({
        where,
        offset,
        limit,
        order: [['createdAt', 'DESC']],
      });
      const currentTime = new Date();

      const formattedFiles = files.map(file => {

        return {
          ...file.toJSON(),
          createdAt: file.createdAt.toISOString().slice(0, 10)
        };
      });

      return res.json({
        meta: { success: true },
        data: {
          formattedFiles,
          schemaNames: FILE__SCHEMA_NAME
        },
      });
    } catch (error) {
      logger.error('Error uploading file with error: ', error);
      next(error);
    }

  }

  //TODO Need to add S3 config
  async downloadFile(req, res, next) {
    const logger = LogFactory.getLogger('FileUploadControllerDownloadFile');
    try {
     
      const fileId = req.params.id;
      const fileRecord = await FileUpload.findByPk(fileId);
      const s3Key = fileRecord.s3_key;
      const fileData = await s3Utility.download(s3Key, 'your_bucket_name');
      res.setHeader('Content-Length', fileData.ContentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.filename}"`);
      res.setHeader('Content-Type', fileData.ContentType);
      fileData.Body.pipe(res);
    } catch (err) {
      logger.error(err);
      next(err);
    }
  }

};

export default FileUploadController;
