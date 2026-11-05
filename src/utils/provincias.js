// Códigos de provincia que usa el checkout (los mismos de bulonerafront/src/utils/provincias.js)
export const PROVINCIAS = {
  C: "CABA",
  B: "Buenos Aires",
  K: "Catamarca",
  H: "Chaco",
  U: "Chubut",
  X: "Córdoba",
  W: "Corrientes",
  E: "Entre Ríos",
  P: "Formosa",
  Y: "Jujuy",
  L: "La Pampa",
  F: "La Rioja",
  M: "Mendoza",
  N: "Misiones",
  Q: "Neuquén",
  R: "Río Negro",
  A: "Salta",
  J: "San Juan",
  D: "San Luis",
  Z: "Santa Cruz",
  S: "Santa Fe",
  G: "Santiago del Estero",
  V: "Tierra del Fuego",
  T: "Tucumán",
};

export const nombreProvincia = (codigo) => PROVINCIAS[codigo] || codigo || "";
