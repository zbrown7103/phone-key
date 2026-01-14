import { NextApiRequest, NextApiResponse } from 'next';
import { validateTwilioSignature, getRawBody, isAllowedCaller, twimlResponse, rateLimit, preventReplay, logAttempt } from '../../../utils/twilio';
import { getVehicleState, toggleLock } from '../../../utils/tessie';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = await getRawBody(req);
  if (!validateTwilioSignature(req, rawBody)) {
    logAttempt(req, false, 'Invalid Twilio signature');
    return res.status(403).send(twimlResponse('Unauthorized.'));
  }
  const from = req.body.From || req.query.From;
  if (!isAllowedCaller(from)) {
    logAttempt(req, false, 'Caller not allowed');
    return res.status(403).send(twimlResponse('Your number is not authorized.'));
  }
  // PIN code requirement removed
  if (!rateLimit(from)) {
    logAttempt(req, false, 'Rate limit exceeded');
    return res.status(429).send(twimlResponse('Too many attempts. Try again later.'));
  }
  if (!preventReplay(from)) {
    logAttempt(req, false, 'Replay detected');
    return res.status(429).send(twimlResponse('Please wait before toggling again.'));
  }
  try {
    const { locked, error } = await getVehicleState();
    if (error) throw new Error(error);
    const toggled = await toggleLock(locked);
    logAttempt(req, true, toggled ? (locked ? 'Unlocked' : 'Locked') : 'No change');
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twimlResponse(toggled ? (locked ? 'Unlocked.' : 'Locked.') : 'No change.'));
  } catch (e: any) {
    logAttempt(req, false, e.message);
    res.status(500).send(twimlResponse('Error toggling lock.'));  
  }
}
