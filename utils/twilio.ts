import { NextApiRequest } from 'next';
import crypto from 'crypto';

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const ALLOWED_CALLERS = (process.env.ALLOWED_CALLERS || '').split(',');
const PIN_CODE = process.env.PIN_CODE || '';

const rateLimitMap = new Map<string, { count: number; last: number }>();
const replayMap = new Map<string, number>();

export async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let data: Buffer[] = [];
    req.on('data', chunk => data.push(chunk));
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', reject);
  });
}

export function validateTwilioSignature(req: NextApiRequest, rawBody: Buffer): boolean {
  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) return false;
  const url = process.env.BASE_URL + req.url;
  const params = req.body || {};
  const sorted = Object.keys(params).sort().map(k => k + params[k]).join('');
  const data = url + sorted;
  const computed = crypto.createHmac('sha1', TWILIO_AUTH_TOKEN).update(data).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

export function isAllowedCaller(from: string): boolean {
  return ALLOWED_CALLERS.includes(from);
}

export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice=\"alice\">${message}</Say>\n  <Hangup/>\n</Response>`;
}

export function rateLimit(from: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(from) || { count: 0, last: 0 };
  if (now - entry.last > 60_000) {
    rateLimitMap.set(from, { count: 1, last: now });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  entry.last = now;
  rateLimitMap.set(from, entry);
  return true;
}

export function preventReplay(from: string): boolean {
  const now = Date.now();
  const last = replayMap.get(from) || 0;
  if (now - last < 10_000) return false;
  replayMap.set(from, now);
  return true;
}

export function logAttempt(req: NextApiRequest, success: boolean, reason: string) {
  const from = req.body.From || req.query.From;
  const digits = req.body.Digits || req.query.Digits;
  console.log(`[${new Date().toISOString()}] From: ${from}, Digits: ${digits}, Success: ${success}, Reason: ${reason}`);
}
