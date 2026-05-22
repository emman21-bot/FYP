const fs = require('fs');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

let s3Client;
if (provider === 's3' || provider === 'minio') {
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT || undefined; // for MinIO
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';

  s3Client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle
  });
}

const bucket = process.env.S3_BUCKET;

async function uploadFile(localPath, destKey, contentType) {
  if (provider === 'local') {
    // already saved by multer; return local path
    return { url: localPath, key: path.basename(localPath), provider: 'local' };
  }

  if (!s3Client || !bucket) {
    throw new Error('S3 client not configured (missing S3_BUCKET or credentials)');
  }

  const fileStream = fs.createReadStream(localPath);
  const params = {
    Bucket: bucket,
    Key: destKey,
    Body: fileStream,
    ContentType: contentType
  };

  await s3Client.send(new PutObjectCommand(params));

  // Construct URL: if custom endpoint provided, use it; otherwise use standard S3 URL
  let url;
  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    // ensure no trailing slash
    const e = endpoint.replace(/\/+$/, '');
    url = `${e}/${bucket}/${destKey}`;
  } else {
    const region = process.env.S3_REGION || 'us-east-1';
    url = `https://${bucket}.s3.${region}.amazonaws.com/${destKey}`;
  }

  return { url, key: destKey, provider };
}

async function getDownloadStream(keyOrUrl) {
  if (provider === 'local') {
    // return fs.createReadStream for local
    return fs.createReadStream(keyOrUrl);
  }

  if (!s3Client || !bucket) throw new Error('S3 client not configured');

  // keyOrUrl may be a full URL or just key
  const key = keyOrUrl.includes('/') ? keyOrUrl.split('/').slice(-2).join('/').split('/').slice(-1)[0] : keyOrUrl;
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const res = await s3Client.send(cmd);
  return res.Body; // stream
}

async function deleteFile(keyOrUrl) {
  if (provider === 'local') {
    try {
      await fs.promises.unlink(keyOrUrl);
      return true;
    } catch (err) {
      return false;
    }
  }

  if (!s3Client || !bucket) throw new Error('S3 client not configured');

  // derive key
  const key = keyOrUrl.includes('/') ? keyOrUrl.split('/').slice(-2).join('/').split('/').slice(-1)[0] : keyOrUrl;
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return true;
}

async function generatePresignedUrl(key, expiresSeconds = 60 * 60) {
  if (provider === 'local') return key;
  if (!s3Client || !bucket) throw new Error('S3 client not configured');
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3Client, cmd, { expiresIn: expiresSeconds });
}

module.exports = {
  uploadFile,
  getDownloadStream,
  deleteFile,
  generatePresignedUrl
};
