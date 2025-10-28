import FileUpload, { FILE__SCHEMA_NAME } from '../models/fileUpload.js';
import FileUploadService from '../services/fileUploadService.js';
import { Op } from 'sequelize';

class FileUploadController {
  async create(req, res, next) {
    try {
      const { upload_type: schemaName } = req.body || {};
      const uploadedFile = req.file;

      
      if (!uploadedFile || !uploadedFile.path || !uploadedFile.originalname) {
        return res.status(400).json({ success: false, message: 'file is required' });
      }

      const { originalname, path: filePath } = uploadedFile;

      const fileUploadService = new FileUploadService(filePath, originalname, schemaName);
      const fileUpload = await fileUploadService.process();

      return res.status(201).json({
        message: 'file upload successful',
        data: { file_upload_id: fileUpload.id },
        success: true,
      });
    } catch (err) {
      logger.error('error in create', err);
      next(err);
    }
  }

  async index(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
      const offset = (page - 1) * limit;


      const where = {};      if (req.query.schema_name) {
        where.schemaName = req.query.schema_name;
      }
      if (req.query.start_date) {
        where.createdAt = { [Op.gte]: new Date(req.query.start_date) };
      }
      if (req.query.end_date) {
        where.createdAt = where.createdAt || {};
        where.createdAt[Op.lte] = new Date(req.query.end_date);
      }
      
      const { count, rows } = await FileUpload.findAndCountAll({
        where,
        offset,
        limit,
        order: [['createdAt', 'DESC']],
      });

      const files = rows.map(f => {
        const json = f.toJSON();
        return {
          ...json,
          createdAt: f.createdAt ? f.createdAt.toISOString().slice(0, 10) : null,
        };
      });

      return res.json({
        meta: { success: true, total: count, page, limit },
        data: { files, schemaNames: FILE__SCHEMA_NAME },
      });
    } catch (error) {
      logger.error('Error fetching uploads', error);
      next(error);
    }
  }
}

export default FileUploadController;
