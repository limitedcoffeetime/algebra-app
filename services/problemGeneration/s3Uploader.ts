import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { ProblemBatch } from './batchGenerator';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(batch: ProblemBatch): Promise<string> {
  const bucketName = process.env.S3_BUCKET_NAME!;
  const batchKey = `problems/${batch.id}.json`;

  const batchContent = JSON.stringify(batch, null, 2);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: batchKey,
      Body: batchContent,
      ContentType: 'application/json',
    }),
  );

  const latestContent = JSON.stringify(
    {
      batchId: batch.id,
      url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${batchKey}`,
      hash: crypto.createHash('sha256').update(batchContent).digest('hex'),
      generatedAt: batch.generationDate,
      problemCount: batch.problemCount,
    },
    null,
    2,
  );

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: 'latest.json',
      Body: latestContent,
      ContentType: 'application/json',
    }),
  );

  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/latest.json`;
}