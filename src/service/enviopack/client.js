import axios from 'axios';
import { getAccessToken } from "./authClient.js";

const BASE_URL = process.env.ENVIOPACK_BASE_URL;

export async function enviopackRequest(method, path, { params = {}, data} = {}) {
    const access_token = await getAccessToken();
    const response = await axios.request({
        method,
        url: `${BASE_URL}${path}`,
        params: { ...params, access_token },
        data,
    });
    return response.data;
}