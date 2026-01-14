type LogStatus = "allowed" | "blocked" | "failed" | "success";

export function logAttempt(entry: {
  caller: string | null;
  status: LogStatus;
  reason?: string;
  details?: Record<string, unknown>;
}): void {
  const payload = {
    timestamp: new Date().toISOString(),
    caller: entry.caller ?? "unknown",
    status: entry.status,
    reason: entry.reason ?? null,
    details: entry.details ?? {},
  };
  console.info("[voice-toggle]", JSON.stringify(payload));
}
