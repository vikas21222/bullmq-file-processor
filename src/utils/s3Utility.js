import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import secrets from '../../config/secrets.js';

class S3Utility {

  getS3Client() {
    return new S3Client({
      region: secrets.awsConfig.region,
      credentials: {
        accessKeyId: secrets.awsConfig.accessKeyId,
        secretAccessKey: secrets.awsConfig.secretAccessKey,
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
        Bucket: secrets.awsConfig.bucketName,
        Key: `${folderPath}/${originalName}`,
        Body: Buffer.from(bytesArray),
      };

      let url = null;

      const s3 = this.getS3Client();
      const data = await s3.send(new PutObjectCommand(params));
      if (data.$metadata.httpStatusCode === 200) {
        const region = secrets.awsConfig.region;
        url = `https://s3.${region}.amazonaws.com/${secrets.awsConfig.bucketName}/${folderPath}/${originalName}`;
        console.log('File URL:', url);
      } else {
        console.log('Error uploading file to S3');
      }
      const s3Key = params.Key;

      return {s3Location: url, s3Key: s3Key};
    } catch (err) {
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
      logger.error(err);
      throw new Error('Error downloading file from S3');
    }
  }


}

export default new S3Utility();
