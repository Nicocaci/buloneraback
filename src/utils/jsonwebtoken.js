import jwt from "jsonwebtoken";

const DEFAULT_EXPIRES_IN = "24h";

const generateToken = (payload) => {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    throw new Error(
      "PRIVATE_KEY no está definida en las variables de entorno. Por favor, configura PRIVATE_KEY en tu archivo .env",
    );
  }

  return jwt.sign(payload, PRIVATE_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
  });
};

export default generateToken;
