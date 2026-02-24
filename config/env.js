import dotenv from 'dotenv';
dotenv.config();

const env = {
  // Postgres
  DB_PSQL_USERNAME: process.env.DB_PSQL_USERNAME || process.env.POSTGRES_USER || 'user',
  DB_PSQL_PASSWORD: process.env.DB_PSQL_PASSWORD || process.env.POSTGRES_PASSWORD || 'password',
  DB_PSQL_DATABASE: process.env.DB_PSQL_DATABASE || process.env.POSTGRES_DB || 'dbname',
  DB_PSQL_PORT: process.env.DB_PSQL_PORT || process.env.POSTGRES_PORT || 5432,
  DB_PG_PRIMARY: process.env.DB_PG_PRIMARY || process.env.DB_HOST || '127.0.0.1',

  // Redis
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: process.env.REDIS_PORT || 6379,

  // AWS
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
  awsRegion: process.env.AWS_REGION || null,
  awsBucketName: process.env.AWS_BUCKET_NAME || null,
};

export default env;
