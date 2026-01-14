import { NextApiRequest, NextApiResponse } from 'next';
import { validateTwilioSignature, getRawBody, isAllowedCaller, twimlResponse } from '../../../utils/twilio';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = await getRawBody(req);
  if (!validateTwilioSignature(req, rawBody)) {
    return res.status(403).send(twimlResponse('Unauthorized.'));
  }
  const from = req.body.From || req.query.From;
  if (!isAllowedCaller(from)) {
    return res.status(403).send(twimlResponse('Your number is not authorized.'));
  }
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" timeout="5" numDigits="6" action="/api/voice/pin" method="POST">
    <Say voice="alice">Please enter your PIN code, then press the pound key.</Say>
  </Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`);
}
