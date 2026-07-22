import { doubleCsrf } from 'csrf-csrf';

if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 32) {
  console.error('FATAL: CSRF_SECRET must be set to a strong random string (32+ chars)');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

export const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.cookies?.token ?? req.ip ?? 'anonymous',
  cookieName: isProd ? '__Host-csrf' : 'csrf',
  cookieOptions: { httpOnly: true, sameSite: isProd ? 'none' : 'strict', secure: isProd },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

export const generateToken = generateCsrfToken;
