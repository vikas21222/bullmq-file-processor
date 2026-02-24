import { isTestEnv } from '../utils/env.js';

const S3Utility = {
  getS3Client() {

    if (isTestEnv()) {
      return {
        send: async () => ({ Body: null })
      };
    }

    // In production the actual S3 client will be created by services/s3Service
    throw new Error('S3 client not configured for non-test environment in s3_utility');
  }
};

export default S3Utility;
