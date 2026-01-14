type TessieStateResponse = {
  vehicle_state?: {
    locked?: boolean;
  };
};

type TessieCommandResponse = {
  result?: boolean;
  reason?: string;
  message?: string;
};

const BASE_URL = "https://api.tessie.com";

function getHeaders(): HeadersInit {
  const token = process.env.TESSE_TOKEN;
  if (!token) {
    throw new Error("TESSE_TOKEN is required");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry<T>(
  path: string,
  init: RequestInit,
  retries = 1
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const text = await response.text();
      const json = text ? (JSON.parse(text) as T) : ({} as T);
      if (response.ok) {
        return json;
      }
      const message = (json as TessieCommandResponse)?.message ?? "";
      if (attempt < retries && shouldRetry(response.status, message)) {
        await sleep(1500);
        continue;
      }
      throw new Error(`Tessie error ${response.status}: ${text}`);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1500);
        continue;
      }
    }
  }
  throw lastError;
}

function shouldRetry(status: number, message: string): boolean {
  if (status === 408 || status === 409) {
    return true;
  }
  return message.toLowerCase().includes("asleep");
}

export async function getLockState(vin: string): Promise<boolean> {
  const state = await requestWithRetry<TessieStateResponse>(
    `/${vin}/state`,
    {
      method: "GET",
      headers: getHeaders(),
    },
    1
  );
  if (!state.vehicle_state || typeof state.vehicle_state.locked !== "boolean") {
    throw new Error("Missing vehicle_state.locked in Tessie response");
  }
  return state.vehicle_state.locked;
}

export async function commandLock(vin: string): Promise<void> {
  await requestWithRetry<TessieCommandResponse>(
    `/${vin}/command/lock`,
    {
      method: "POST",
      headers: getHeaders(),
    },
    1
  );
}

export async function commandUnlock(vin: string): Promise<void> {
  await requestWithRetry<TessieCommandResponse>(
    `/${vin}/command/unlock`,
    {
      method: "POST",
      headers: getHeaders(),
    },
    1
  );
}
