import type { NextApiRequest, NextApiResponse } from "next";
import { readRawBody } from "../../../lib/raw-body";
import { parseFormBody, validateTwilioSignature } from "../../../lib/twilio";
import { sayAndHangupTwiml } from "../../../lib/twiml";
import {
  checkRateLimit,
  checkReplayWindow,
  isCallerAllowed,
  markToggle,
  normalizePhone,
} from "../../../lib/security";
import { logAttempt } from "../../../lib/logger";
import { commandLock, commandUnlock, getLockState } from "../../../lib/tessie";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getRequestUrl(req: NextApiRequest): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is required");
  }
  return new URL(req.url ?? "", baseUrl).toString();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const rawBody = await readRawBody(req);
  const params = parseFormBody(rawBody);
  const caller = normalizePhone(params.From);

  const validSignature = validateTwilioSignature(
    getRequestUrl(req),
    params,
    req.headers["x-twilio-signature"] as string | undefined,
    process.env.TWILIO_AUTH_TOKEN
  );

  if (!validSignature) {
    logAttempt({ caller, status: "blocked", reason: "invalid_signature" });
    res.status(403).send("Forbidden");
    return;
  }

  if (!isCallerAllowed(caller)) {
    logAttempt({ caller, status: "blocked", reason: "caller_not_allowed" });
    res.status(403).send("Forbidden");
    return;
  }

  const rate = checkRateLimit(caller ?? "unknown");
  if (!rate.allowed) {
    logAttempt({ caller, status: "blocked", reason: "rate_limited" });
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(sayAndHangupTwiml("Too many attempts. Goodbye."));
    return;
  }

  const replay = checkReplayWindow(caller ?? "unknown");
  if (!replay.allowed) {
    logAttempt({ caller, status: "blocked", reason: "replay_window" });
    res.setHeader("Content-Type", "text/xml");
    res
      .status(200)
      .send(sayAndHangupTwiml("Please wait before trying again. Goodbye."));
    return;
  }

  const vin = process.env.TESLA_VIN;
  if (!vin) {
    logAttempt({ caller, status: "failed", reason: "missing_vin" });
    res.setHeader("Content-Type", "text/xml");
    res
      .status(200)
      .send(sayAndHangupTwiml("Configuration error. Goodbye."));
    return;
  }

  try {
    const locked = await getLockState(vin);
    if (locked) {
      await commandUnlock(vin);
      markToggle(caller ?? "unknown");
      logAttempt({ caller, status: "success", reason: "unlocked" });
      res.setHeader("Content-Type", "text/xml");
      res.status(200).send(sayAndHangupTwiml("Unlocked."));
      return;
    }
    await commandLock(vin);
    markToggle(caller ?? "unknown");
    logAttempt({ caller, status: "success", reason: "locked" });
    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(sayAndHangupTwiml("Locked."));
  } catch (error) {
    logAttempt({
      caller,
      status: "failed",
      reason: "tessie_error",
      details: { message: (error as Error).message },
    });
    res.setHeader("Content-Type", "text/xml");
    res
      .status(200)
      .send(sayAndHangupTwiml("Unable to reach vehicle. Goodbye."));
  }
}
