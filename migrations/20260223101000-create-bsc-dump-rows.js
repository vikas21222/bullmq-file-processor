/**
 * Migration: create bsc_dump_rows table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bsc_dump_rows', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending','processing','failed','success'),
        allowNull: false,
        defaultValue: 'pending',
      },
      request_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      request_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      request_schema: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      row_num: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      raw_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bsc_dump_rows');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bsc_dump_rows_status"');
  }
};
