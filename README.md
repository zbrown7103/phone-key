# Tesla Phone Toggle (Tessie + Twilio)

Serverless Twilio Voice webhook that toggles Tesla lock state via Tessie.

## Endpoints
- `POST /api/voice/incoming` -> toggles lock/unlock
- `POST /api/voice/pin` -> legacy endpoint (no longer used)

## Environment Variables
See `.env.example` for all required values:
- `TWILIO_AUTH_TOKEN`
- `TESSE_TOKEN`
- `TESLA_VIN`
- `ALLOWED_CALLERS`
- `BASE_URL`

## TwiML Responses
Success:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Unlocked.</Say>
  <Hangup/>
</Response>
```

## Vercel Deployment Notes
1. Create a new Vercel project pointing at this repo.
2. Add environment variables from `.env.example`.
3. Ensure `BASE_URL` matches your deployed Vercel URL (https).

## Twilio Console Configuration
1. Phone Numbers -> Manage -> Active numbers -> your number.
2. Voice Configuration -> A call comes in:
   - Method: `POST`
   - URL: `https://your-domain.vercel.app/api/voice/incoming`
3. Ensure the number is configured to use TwiML webhooks (not TwiML Bins).

## Security Controls
- Twilio signature validation with raw request body
- Caller allowlist
- Rate limiting and replay protection (10 seconds)
- Attempt logging via `console.info`
