import { logger } from '../utils/logger.js';
import { existsSync } from 'node:fs';

const S3_ENABLED = !!process.env.S3_ENABLED;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
const S3_PREFIX = (process.env.S3_PREFIX || 'daemon').replace(/\/+$/, '');
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || '';

let s3Client: any = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  if (!S3_ENABLED || !S3_BUCKET) return null;

  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const config: any = {
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    };
    if (S3_ENDPOINT) {
      config.endpoint = S3_ENDPOINT;
      config.forcePathStyle = true;
    }
    s3Client = new S3Client(config);
    logger.info('STORAGE', 'S3 client initialized', { bucket: S3_BUCKET, region: S3_REGION, endpoint: S3_ENDPOINT || 'default' });
    return s3Client;
  } catch (err: any) {
    logger.error('STORAGE', `Failed to init S3 client: ${err.message}`);
    return null;
  }
}

export async function uploadToS3(
  projectId: string,
  filePath: string,
  fileName: string,
): Promise<{ s3Key: string; s3Url: string } | null> {
  const client = await getS3Client();
  if (!client) return null;

  if (!existsSync(filePath)) {
    logger.warn('STORAGE', `File not found for S3 upload: ${filePath}`);
    return null;
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3Key = `${S3_PREFIX}/${projectId}/${fileName}`;

  try {
    const { readFileSync } = await import('node:fs');
    const body = readFileSync(filePath);

    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: body,
    }));

    const s3Url = S3_PUBLIC_URL
      ? `${S3_PUBLIC_URL.replace(/\/+$/, '')}/${s3Key}`
      : `s3://${S3_BUCKET}/${s3Key}`;

    logger.info('STORAGE', `Uploaded ${s3Key} to S3 (${body.length} bytes)`);
    return { s3Key, s3Url };
  } catch (err: any) {
    logger.error('STORAGE', `S3 upload failed for ${s3Key}: ${err.message}`);
    return null;
  }
}

export function isS3Enabled(): boolean {
  return S3_ENABLED && !!S3_BUCKET;
}
