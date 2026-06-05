import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Career Copilot" <${process.env.SMTP_USER}>`,
    to, subject, html
  });
}

export function resetPasswordEmail(to, token) {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendMail({
    to, subject: 'Reset your password — Career Copilot',
    html: `<p>Click below to reset your password:</p><p><a href="${link}">${link}</a></p><p>Expires in 1 hour.</p>`
  });
}
