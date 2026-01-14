import crypto from "crypto";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const REPLAY_WINDOW_MS = 10 * 1000;

type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitState>();
const lastToggle = new Map<string, number>();

export function normalizePhone(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function isCallerAllowed(caller: string | null): boolean {
  if (!caller) {
    return false;
  }
  const allowed = process.env.ALLOWED_CALLERS ?? "";
  const list = allowed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.includes(caller);
}

export function validatePin(pin: string | undefined): boolean {
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return false;
  }
  const expected = process.env.PIN_CODE?.trim();
  if (!expected || !/^\d{4,6}$/.test(expected)) {
    return false;
  }
  const pinBuf = Buffer.from(pin);
  const expectedBuf = Buffer.from(expected);
  if (pinBuf.length !== expectedBuf.length) {
    const max = Math.max(pinBuf.length, expectedBuf.length);
    const paddedPin = Buffer.concat([pinBuf, Buffer.alloc(max - pinBuf.length)]);
    const paddedExpected = Buffer.concat([
      expectedBuf,
      Buffer.alloc(max - expectedBuf.length),
    ]);
    crypto.timingSafeEqual(paddedPin, paddedExpected);
    return false;
  }
  return crypto.timingSafeEqual(pinBuf, expectedBuf);
}

export function checkRateLimit(
  caller: string
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const state = rateLimits.get(caller);
  if (!state || now >= state.resetAt) {
    rateLimits.set(caller, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (state.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: state.resetAt - now };
  }
  state.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function checkReplayWindow(
  caller: string
): { allowed: boolean; waitMs: number } {
  const now = Date.now();
  const last = lastToggle.get(caller);
  if (last && now - last < REPLAY_WINDOW_MS) {
    return { allowed: false, waitMs: REPLAY_WINDOW_MS - (now - last) };
  }
  return { allowed: true, waitMs: 0 };
}

export function markToggle(caller: string): void {
  lastToggle.set(caller, Date.now());
}
