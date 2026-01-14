import crypto from "crypto";

type TwilioParams = Record<string, string>;

export function parseFormBody(body: string): TwilioParams {
  const params = new URLSearchParams(body);
  const result: TwilioParams = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function buildSignaturePayload(url: string, params: TwilioParams): string {
  const keys = Object.keys(params).sort();
  let payload = url;
  for (const key of keys) {
    payload += key + params[key];
  }
  return payload;
}

export function validateTwilioSignature(
  url: string,
  params: TwilioParams,
  signature: string | undefined,
  authToken: string | undefined
): boolean {
  if (!signature || !authToken) {
    return false;
  }
  const payload = buildSignaturePayload(url, params);
  const digest = crypto
    .createHmac("sha1", authToken)
    .update(payload, "utf8")
    .digest("base64");
  return timingSafeEqual(digest, signature);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    const max = Math.max(aBuf.length, bBuf.length);
    const paddedA = Buffer.concat([aBuf, Buffer.alloc(max - aBuf.length)]);
    const paddedB = Buffer.concat([bBuf, Buffer.alloc(max - bBuf.length)]);
    crypto.timingSafeEqual(paddedA, paddedB);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
