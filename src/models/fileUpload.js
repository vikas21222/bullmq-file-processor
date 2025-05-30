import pkg from 'sequelize';
import sequelize from '../../config/sequelize.js';
const { DataTypes, Model, } = pkg;

const FILE_UPLOAD_STATUSES = {
  processing: 'processing',
  completed: 'completed',
  pending: 'pending',
  failed: 'failed',
};

const FILE_UPLOAD_TYPES = {
 
  bse_scheme: 'BSE_SCHEME',
 
  
};

class FileUpload extends Model { }

FileUpload.init({
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    get() {
      const rawValue = this.getDataValue('id');

      return rawValue && String(rawValue);
    }
  },
  filename: {
    type:DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(FILE_UPLOAD_STATUSES)),
    allowNull: false,
    defaultValue: 'processing'
  },
  file_type: {
    type: DataTypes.ENUM( 'excel', 'csv', 'dbf'),
    allowNull: false,
    defaultValue: 'document'
  },
  schema_name: {
    type: DataTypes.ENUM(...Object.values(FILE_UPLOAD_TYPES)),
    allowNull: false,
  },
  s3_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  s3_key: {
    type: DataTypes.STRING,
    allowNull: true
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_processing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
  }
  
}, {
  sequelize,
  timestamps: true,
  modelName: 'FileUpload',
  tableName: 'file_uploads',
  underscored:true,
});

export default FileUpload;

export { FILE_UPLOAD_TYPES, FILE_UPLOAD_STATUSES };
