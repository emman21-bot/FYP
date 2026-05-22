const { Worker, QueueScheduler } = require('bullmq');
const { connection } = require('../utils/queue');
const { sendEmail } = require('../utils/emailHelper');

// Ensure jobs are scheduled and retried properly
new QueueScheduler('emailQueue', { connection });

const worker = new Worker('emailQueue', async job => {
  const { name, data } = job;

  try {
    switch (name) {
      case 'sendEmail':
      case 'appointmentReminder': {
        const { email, subject, html, text, from } = data;
        await sendEmail({ email, subject, html, text, from });
        return { ok: true };
      }
      default:
        throw new Error(`Unknown job name: ${name}`);
    }
  } catch (err) {
    console.error(`Email worker failed job ${job.id} (${name}):`, err.message);
    throw err; // Let BullMQ handle retries/backoff
  }
}, { connection });

worker.on('completed', job => {
  console.log(`✅ Email job completed: ${job.id} (${job.name})`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Email job failed: ${job.id} (${job.name}) - ${err.message}`);
});

module.exports = worker;
