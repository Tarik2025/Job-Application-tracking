import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  // Verify SMTP config at startup so misconfiguration is caught early
  transporter.verify().catch(err => console.error('SMTP configuration error:', err.message));
} else {
  console.warn('SMTP not configured — email features disabled (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
}

export async function sendMail({ to, subject, html }) {
  if (!transporter) {
    throw new Error('SMTP not configured — cannot send email');
  }
  return transporter.sendMail({
    from: `"Career Copilot" <${process.env.SMTP_USER}>`,
    to, subject, html
  });
}

export function resetPasswordEmail(to, token) {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail({
    to, subject: 'Reset your password — Career Copilot',
    html: `<p>Click below to reset your password:</p><p><a href="${link}">${link}</a></p><p>Expires in 1 hour.</p>`
  });
}
