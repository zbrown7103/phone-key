import fetch from 'node-fetch';

const BASE_URL = 'https://api.tessie.com';
const TESSE_TOKEN = process.env.TESSE_TOKEN;
const TESLA_VIN = process.env.TESLA_VIN;

async function fetchWithRetry(url: string, options: any, retries = 1): Promise<any> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries > 0) return fetchWithRetry(url, options, retries - 1);
    throw err;
  }
}

export async function getVehicleState() {
  const url = `${BASE_URL}/${TESLA_VIN}/state`;
  const options = {
    headers: { Authorization: `Bearer ${TESSE_TOKEN}` },
  };
  const data = await fetchWithRetry(url, options, 1);
  if (!data || typeof data.vehicle_state?.locked !== 'boolean') {
    return { locked: null, error: 'Could not fetch vehicle state' };
  }
  return { locked: data.vehicle_state.locked, error: null };
}

export async function toggleLock(locked: boolean) {
  const url = `${BASE_URL}/${TESLA_VIN}/command/${locked ? 'unlock' : 'lock'}`;
  const options = {
    method: 'POST',
    headers: { Authorization: `Bearer ${TESSE_TOKEN}` },
  };
  const res = await fetchWithRetry(url, options, 1);
  return res && res.result === true;
}
