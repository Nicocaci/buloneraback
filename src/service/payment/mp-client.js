import { MercadoPagoConfig } from "mercadopago";

// Cliente único de Mercado Pago. El token sale del .env (de prueba en local, real en Railway).
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
