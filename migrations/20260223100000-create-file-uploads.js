/**
 * Migration: create file_uploads table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('file_uploads', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('processing','completed','pending','failed'),
        allowNull: false,
        defaultValue: 'processing',
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      schema_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      s3_location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      s3_key: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_processing: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable('file_uploads');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_file_uploads_status"');
  }
};
