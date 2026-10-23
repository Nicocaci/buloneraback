import jwt from "jsonwebtoken";

// Primero el header Authorization (es lo que usa el frontend); la cookie queda como respaldo.
const getToken = (req) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.access_token || null;
};

const verify = (token) => jwt.verify(token, process.env.PRIVATE_KEY);

// Exige sesión. Si se pasan roles, además exige uno de esos roles.
const authMiddleware = (roles = []) => (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Necesitás iniciar sesión" });
  }

  try {
    req.user = verify(token);
  } catch {
    return res.status(401).json({ message: "Tu sesión venció o no es válida" });
  }

  if (roles.length && !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "No autorizado" });
  }

  next();
};

// Sesión opcional: si hay un token válido completa req.user; si no, sigue como invitado.
export const optionalAuth = (req, res, next) => {
  const token = getToken(req);
  if (token) {
    try {
      req.user = verify(token);
    } catch {
      // Token vencido o inválido: se trata como invitado.
    }
  }
  next();
};

// Permite el acceso solo al dueño del recurso (req.params[param] === id del token) o a un admin.
// Debe usarse después de authMiddleware().
export const ownerOrAdmin = (param = "id") => (req, res, next) => {
  if (
    req.user?.role === "admin" ||
    String(req.params[param]) === String(req.user?.id)
  ) {
    return next();
  }
  return res.status(403).json({ message: "No autorizado" });
};

export default authMiddleware;
