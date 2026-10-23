const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const PHONE_REGEX = /^[0-9+\-\s()]{6,30}$/;

// Devuelve el string sin espacios a los costados, o "" si no es un string.
export const clean = (value) => (typeof value === "string" ? value.trim() : "");

export const isNonEmpty = (value, max = 200) => {
  const v = clean(value);
  return v.length > 0 && v.length <= max;
};

export const isOptional = (value, max = 200) =>
  value === undefined || value === null || clean(value).length <= max;

export const isValidEmail = (value) => {
  const v = clean(value);
  return v.length <= 254 && EMAIL_REGEX.test(v);
};

export const isValidPhone = (value) => PHONE_REGEX.test(clean(value));

export const isValidObjectId = (value) =>
  typeof value === "string" && OBJECT_ID_REGEX.test(value);

export const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Toma un query param solo si es un string (evita arrays u objetos inesperados).
export const queryString = (value) => (typeof value === "string" ? value : undefined);
