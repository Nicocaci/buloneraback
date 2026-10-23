// Error "esperado" de la aplicación: su mensaje es seguro para mostrarle al cliente.
// Cualquier otro error se responde como 500 genérico (ver middlewares/error-handler.js).
export default class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
