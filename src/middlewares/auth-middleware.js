import jwt from "jsonwebtoken";

const authMiddleware = (roles = []) => (req, res, next) => {
    try {
        const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Token requerido" });

        const payload = jwt.verify(token, process.env.PRIVATE_KEY);
        req.user = payload;

        if (roles.length && !roles.includes(payload.role)) {
            return res.status(403).json({ message: "No autorizado" });
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: "Token inválido", error: err.message });
    }
};

export default authMiddleware;