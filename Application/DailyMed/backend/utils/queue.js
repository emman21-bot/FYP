const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Read Redis config from env
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
});

// Create named queues with sensible defaults
const emailRateMax = process.env.EMAIL_RATE_LIMIT_MAX ? parseInt(process.env.EMAIL_RATE_LIMIT_MAX, 10) : 20; // jobs
const emailRateDuration = process.env.EMAIL_RATE_LIMIT_DURATION_MS ? parseInt(process.env.EMAIL_RATE_LIMIT_DURATION_MS, 10) : 60 * 1000; // ms

const emailQueue = new Queue('emailQueue', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 }
  },
  limiter: {
    max: emailRateMax,
    duration: emailRateDuration
  }
});

const notificationQueue = new Queue('notificationQueue', { connection });
const mlQueue = new Queue('mlQueue', { connection });

module.exports = {
  connection,
  emailQueue,
  notificationQueue,
  mlQueue,
};
