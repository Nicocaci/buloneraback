import axios from 'axios';

const BASE_URL = process.env.ENVIOPACK_BASE_URL;

let cachedToken = null;
let pendingTokenRequest = null;

async function requestNewToken() {
    if (pendingTokenRequest) {
        return pendingTokenRequest;
    }
  const params = new URLSearchParams();
  params.append("api-key", process.env.ENVIOPACK_API_KEY);
  params.append("secret-key", process.env.ENVIOPACK_SECRET_KEY);


  const { data } = await axios.post(`${BASE_URL}/auth`, params, {
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  cachedToken = {
    access_token: data.token,
    refresh_token: data.refresh_token,
    expiresAt: Date.now() + (4 * 60 - 5) * 60 * 1000,
  };
  return cachedToken;
}

async function refreshToken() {
    const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        params: { refresh_token: cachedToken.refresh_token},
    });
    cachedToken = {
        access_token: data.token,
        refresh_token: data.refresh_token,
        expiresAt: Date.now() + (4 * 60 - 5 ) * 60 * 1000,
    };
    return cachedToken;
}

export async function getAccessToken() {
    if(!cachedToken) return (await requestNewToken()).access_token;
    if(Date.now() >= cachedToken.expiresAt) {
        try {
            return (await refreshToken()).access_token;
        } catch {
            return (await requestNewToken()).access_token;
        }
    }
    return cachedToken.access_token;
}