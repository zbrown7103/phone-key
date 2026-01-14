import type { NextApiRequest, NextApiResponse } from "next";
import { sayAndHangupTwiml } from "../../../lib/twiml";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  res.setHeader("Content-Type", "text/xml");
  res.status(410).send(sayAndHangupTwiml("PIN entry is no longer required."));
}
