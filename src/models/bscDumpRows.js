import pkg from 'sequelize';
import sequelize from '../../lib/sequelize.js';

const { DataTypes, Model } = pkg;

class BscDumpRow extends Model {
  static associate(models) {
  }
}

export const RTA_SIP_DUMP_ROW_STATUSES = {
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
      type: DataTypes.ENUM(...Object.values(RTA_SIP_DUMP_ROW_STATUSES)),
      allowNull: false,
      defaultValue: RTA_SIP_DUMP_ROW_STATUSES.PENDING,
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
    rta_sip_detail_id: {
      type: DataTypes.BIGINT,
    },
    amc_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    folio_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rta_scheme_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    registration_number: {
      type: DataTypes.STRING,
    },
    amount: {
      type: DataTypes.STRING,
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
    tableName: 'rta_sip_dump_rows',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['request_id', 'request_type', 'row_num'],
      },
      {
        fields: ['registration_number'],
      },
      {
        fields: ['rta_sip_detail_id'],
      },
    ],
  }
);

export default BscDumpRow;
