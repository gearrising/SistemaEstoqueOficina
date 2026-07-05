import jwt, { SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

const accessOptions: SignOptions = { expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] };
const refreshOptions: SignOptions = { expiresIn: REFRESH_EXPIRES as jwt.SignOptions['expiresIn'] };

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, accessOptions);
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, refreshOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

export function getRefreshExpiry(): Date {
  const days = parseInt(REFRESH_EXPIRES.replace('d', '')) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
