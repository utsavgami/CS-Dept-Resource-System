import 'dotenv/config';
import nodemailer from 'nodemailer';

const to = process.argv[2];
if (!to) {
  console.error('Use: node test-mail.js someone@example.com');
  process.exit(1);
}

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000
});

try {
  await t.verify();
  console.log('1) SMTP login OK');
  const info = await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Test mail - CS Portal',
    text: 'Ye ek test mail hai.'
  });
  console.log('2) accepted:', info.accepted);
  console.log('3) rejected:', info.rejected);
  console.log('4) response:', info.response);
} catch (err) {
  console.error('FAILED:', err.code, '-', err.message);
}