import pkg from 'sequelize';
import sequelize from '../../lib/sequelize.js';

const { DataTypes, Model } = pkg;

class BscDumpRow extends Model {
  static associate(models) {
  }
}

export const BSE_DUMP_ROW_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  FAILED: 'failed',
  SUCCESS: 'success'
};


BscDumpRow.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BSE_DUMP_ROW_STATUSES)),
      allowNull: false,
      defaultValue: BSE_DUMP_ROW_STATUSES.PENDING,
    },
    request_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    request_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    request_schema: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    row_num: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    remarks: {
      type: DataTypes.STRING,
    },
    raw_data: {
      type: DataTypes.JSONB,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
  },
  {
    sequelize,
    modelName: 'BscDumpRow',
    tableName: 'bsc_dump_rows',
    underscored: true,
    timestamps: true,
  }
);

export default BscDumpRow;
