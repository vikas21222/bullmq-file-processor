require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_PSQL_USERNAME || 'user',
    password: process.env.DB_PSQL_PASSWORD || 'password',
    database: process.env.DB_PSQL_DATABASE || 'dbname',
    host: process.env.DB_PG_PRIMARY || process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PSQL_PORT || 5432,
    dialect: 'postgres'
  },
  test: {
    username: process.env.DB_PSQL_USERNAME || 'user',
    password: process.env.DB_PSQL_PASSWORD || 'password',
    database: process.env.DB_PSQL_DATABASE || 'dbname_test',
    host: process.env.DB_PG_PRIMARY || process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PSQL_PORT || 5432,
    dialect: 'postgres'
  },
  production: {
    username: process.env.DB_PSQL_USERNAME,
    password: process.env.DB_PSQL_PASSWORD,
    database: process.env.DB_PSQL_DATABASE,
    host: process.env.DB_PG_PRIMARY,
    port: process.env.DB_PSQL_PORT || 5432,
    dialect: 'postgres'
  }
};
