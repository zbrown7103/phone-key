# Tesla Phone Toggle Server

A secure, production-ready serverless system to toggle your Tesla lock state by calling a Twilio number and entering a PIN. Hosted on Vercel, using Next.js API routes, Twilio Voice Webhooks, and the Tessie API.

---

## File Tree

```
phone-key/
├── pages/
│   └── api/
│       └── voice/
│           ├── incoming.ts
│           └── pin.ts
├── utils/
│   ├── tessie.ts
│   └── twilio.ts
├── README.md
```

---

## TwiML Responses

- **/api/voice/incoming**: Prompts for PIN
- **/api/voice/pin**: Confirms lock/unlock or error, then hangs up

---

## Tessie API Helper (`utils/tessie.ts`)
- Handles vehicle state fetch and lock toggle
- Retries once if vehicle is asleep

---

## Twilio Signature Validation Utility (`utils/twilio.ts`)
- Validates Twilio webhook signatures (HMAC-SHA1)
- Disables body parsing, uses raw body
- Constant-time PIN comparison
- Rate limiting and replay protection
- Logs all attempts

---

## Deployment Notes (Vercel)

1. **Environment Variables** (set in Vercel dashboard):
   - `TWILIO_AUTH_TOKEN` (Twilio console)
   - `TESSE_TOKEN` (Tessie API)
   - `TESLA_VIN` (your Tesla VIN)
   - `ALLOWED_CALLERS` (comma-separated, E.164 format)
   - `PIN_CODE` (4–6 digits)
   - `BASE_URL` (e.g. `https://your-vercel-domain.vercel.app`)
2. Deploy to Vercel (auto-detects Next.js API routes)

---

## Twilio Console Configuration

1. Buy a Twilio phone number
2. Set **Voice webhook**:
   - **A CALL COMES IN**: `POST` to `https://<your-vercel-domain>/api/voice/incoming`
   - **CALL STATUS CHANGES**: (optional, not required)
3. Enable **Request Inspector** for debugging
4. Ensure your Twilio number is in `ALLOWED_CALLERS`

---

## Security
- Only allow-listed numbers can toggle
- PIN required (constant-time compare)
- Twilio signature validation
- Rate limiting and replay protection
- All attempts logged

---

## Non-Goals
- No SMS, UI, or Tesla Fleet API

---

## Definition of Done
- Calling Twilio number and entering correct PIN toggles Tesla lock
- Unauthorized/invalid requests are rejected
- Deploys cleanly on Vercel
