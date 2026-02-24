import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { LogFactory } from '../../lib/logger.js';
import env from '../../config/env.js';

class S3Service {

  getS3Client() {
    return new S3Client({
      region: env.awsRegion || env.aws_region,
      credentials: {
        accessKeyId: env.awsAccessKeyId || env.aws_access_key_id,
        secretAccessKey: env.awsSecretAccessKey || env.aws_secret_access_key,
      },
    });
  }

  checking() {
    console.log(this.getS3Client());
  }

  async uploadFileToS3(originalName, bytesArray, folderName = '') {
    try {
      
      const folderPath = `${folderName}` ;
      console.log('folderPath', folderPath);

      const params = {
        Bucket: env.awsBucketName || env.aws_bucket_name,
        Key: `${folderPath}/${originalName}`,
        Body: Buffer.from(bytesArray),
      };

      let url = null;

      const s3 = this.getS3Client();
      const data = await s3.send(new PutObjectCommand(params));
      if (data.$metadata.httpStatusCode === 200) {
        const region = env.awsRegion || env.aws_region;
        const bucket = env.awsBucketName || env.aws_bucket_name;
        url = `https://s3.${region}.amazonaws.com/${bucket}/${folderPath}/${originalName}`;
        console.log('File URL:', url);
      } else {
        console.log('Error uploading file to S3');
      }
      const s3Key = params.Key;

      return {s3Location: url, s3Key: s3Key};
    } catch (err) {
      const logger = LogFactory.getLogger('S3Service');
      logger.error(err);
      throw new Error('Error uploading file to S3');
    }
  }

// TODO For download file from S3
  async download(key, bucketName) {
    try {
      const params = {
        Bucket: bucketName,
        Key: key,
      };
      const s3 = this.getS3Client();
      const data = await s3.send(new GetObjectCommand(params));

      return data;
    } catch (err) {
      const logger = LogFactory.getLogger('S3Service');
      logger.error(err);
      throw new Error('Error downloading file from S3');
    }
  }


}

export default new S3Service();
