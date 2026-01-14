function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function gatherPinTwiml(actionUrl: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Gather action="${escapeXml(
      actionUrl
    )}" method="POST" input="dtmf" finishOnKey="#" timeout="6">`,
    "    <Say>Please enter your PIN, then press the pound key.</Say>",
    "  </Gather>",
    "  <Say>No input received. Goodbye.</Say>",
    "  <Hangup/>",
    "</Response>",
  ].join("");
}

export function sayAndHangupTwiml(message: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say>${escapeXml(message)}</Say>`,
    "  <Hangup/>",
    "</Response>",
  ].join("");
}
