import jwt from "jsonwebtoken";

const generateToken = (user) => {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    
    if (!PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY no está definida en las variables de entorno. Por favor, configura PRIVATE_KEY en tu archivo .env");
    }
    
    return jwt.sign(user, PRIVATE_KEY, { expiresIn: "1h" });
};
export default generateToken;