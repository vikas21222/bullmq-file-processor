import { Sequelize } from 'sequelize';
import env from '../config/env.js';

const options = {
  port: env.DB_PSQL_PORT,
    database: env.DB_PSQL_DATABASE,
    username: env.DB_PSQL_USERNAME,
    password: env.DB_PSQL_PASSWORD,
    dialect: 'postgres',
    replication: {
      read: [
        { host: env.pgReadReplica1 },
      ],
      write: { host: env.dbPgPrimary },
    },};

LogFactory.getLogger().info(options);
options.minifyAliases = true;

// Added connection pool for postgre database
options.pool = {
  max: 20,
  min: 0,
  acquire: 60000,
  idle: 10000,
};

// Override the logging function to use our own logger
options.logging = (msg) => {
  LogFactory.getLogger().info(msg);
};

options.benchmark = true;


const sequelize = new Sequelize(options);

sequelize.authenticate().then(() => {
  console.log('PG Database Connection has been established successfully.');
}).catch((error) => {
  console.log('Unable to connect to the PG Database: ', error);
});



export default sequelize;
