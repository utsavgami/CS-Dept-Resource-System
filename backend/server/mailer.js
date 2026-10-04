import nodemailer from 'nodemailer';

// Reads SMTP settings from environment variables — see .env.example notes
// shared alongside this feature. For Gmail: host smtp.gmail.com, port 587,
// secure=false, and an App Password (not your normal Gmail password) as
// SMTP_PASS. Gmail App Passwords require 2-Step Verification to be on.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// purpose: 'register' | 'reset' — only changes the subject/copy, not the
// delivery mechanism.
export async function sendOtpEmail(toEmail, otp, purpose = 'register') {
  const isReset = purpose === 'reset';

  const subject = isReset
    ? 'Your CS Portal password reset code'
    : 'Your CS Portal verification code';

  const intro = isReset
    ? 'Use the code below to reset your password.'
    : 'Use the code below to verify your email and finish creating your account.';

  const safetyNote = isReset
    ? "This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't change."
    : "This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.";

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    text: `${intro} Your code is ${otp}. ${safetyNote}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
        <h2 style="color:#2563eb; margin-bottom: 4px;">CS Department Resource Sharing</h2>
        <p style="color:#334155; font-size: 14px;">${intro}</p>
        <p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color:#0f172a; margin: 20px 0;">${otp}</p>
        <p style="color:#64748b; font-size: 12px;">${safetyNote}</p>
      </div>
    `
  });
}