// Búsqueda de productos en memoria.
// La tienda tiene pocos productos (~150): se guarda una copia liviana de los productos
// activos y se busca sobre ella. Ignora mayúsculas y acentos, acepta partes de palabras
// ("amol" → amoladora), tolera errores de tipeo ("amoladra") y ordena por relevancia.
// La copia se renueva cada 60 segundos o al instante cuando el admin cambia un producto.
import ProductModel, { isOfertaVigente } from "../dao/models/product-model.js";

const VIGENCIA_MS = 60 * 1000;
const MAX_TERMINOS = 8;

let indice = null; // { productos, expira }
let cargando = null;

// "Bulón 1/2\" Hexagonal" → "bulon 1/2 hexagonal"
export const normalizar = (texto = "") =>
  String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/.,]+/g, " ")
    .replace(/(?<=\D)[.,]|[.,](?=\D|$)/g, " ") // puntos y comas sueltos; conserva 1.5 o 3,5
    .trim();

const palabras = (texto) => normalizar(texto).split(/\s+/).filter(Boolean);

// Distancia de edición (Damerau "restringida": inserción, borrado, cambio y letras
// invertidas como "amoaldora"). Corta apenas se pasa del máximo permitido.
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let antePrevia = null;
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const actual = new Array(b.length + 1);
    actual[0] = i;
    let minimoFila = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
      if (antePrevia && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, antePrevia[j - 2] + 1);
      }
      actual[j] = v;
      if (v < minimoFila) minimoFila = v;
    }
    if (minimoFila > max) return max + 1;
    antePrevia = previa;
    previa = actual;
  }
  return previa[b.length];
}

// Errores de tipeo tolerados según el largo de lo que se escribió
const toleranciaPara = (termino) => (termino.length >= 7 ? 2 : termino.length >= 4 ? 1 : 0);

// Peso de cada campo en la relevancia
const CAMPOS = [
  ["item", 3],
  ["marca", 2],
  ["subcategoria", 2],
  ["categoria", 1],
];

// SKU sin espacios ni símbolos: "FIJ-0011" y "fij 0011" se comparan igual
const comoSku = (texto) => normalizar(texto).replace(/[^a-z0-9]/g, "");
// Solo se busca por SKU si lo escrito tiene algún número (si no, "her" coincidiría
// con todos los SKU que empiezan con esas letras)
const pareceSku = (sku) => sku.length >= 3 && /\d/.test(sku);

function puntajeTermino(termino, producto) {
  let mejor = 0;
  const terminoSku = comoSku(termino);
  if (pareceSku(terminoSku)) {
    if (producto.skuNorm === terminoSku) return 12;
    if (producto.skuNorm.startsWith(terminoSku)) mejor = 8;
  }

  const tolerancia = toleranciaPara(termino);
  for (const [campo, peso] of CAMPOS) {
    for (const palabra of producto.palabras[campo]) {
      let p = 0;
      if (palabra === termino) p = 5;
      else if (palabra.startsWith(termino)) p = 4;
      // en el medio de la palabra cuenta poco y pide 4 letras ("her" no debe traer "Fischer")
      else if (termino.length >= 4 && palabra.includes(termino)) p = 1;
      else if (tolerancia > 0) {
        // compara contra la palabra entera y contra su comienzo (para búsquedas incompletas con error)
        const d = Math.min(
          distancia(termino, palabra, tolerancia),
          palabra.length > termino.length
            ? distancia(termino, palabra.slice(0, termino.length), tolerancia)
            : tolerancia + 1,
        );
        if (d <= tolerancia) p = d === 1 ? 2 : 1;
      }
      if (p) mejor = Math.max(mejor, p * peso);
    }
  }
  return mejor;
}

async function cargarIndice() {
  const docs = await ProductModel.find(
    { estado: "activo" },
    { item: 1, marca: 1, categoria: 1, subcategoria: 1, sku: 1, stock: 1, oferta: 1 },
  ).lean();

  const productos = docs.map((d) => ({
    _id: d._id,
    item: d.item,
    marca: d.marca,
    categoria: d.categoria,
    subcategoria: d.subcategoria,
    stock: d.stock,
    oferta: d.oferta,
    skuNorm: comoSku(d.sku),
    palabras: Object.fromEntries(CAMPOS.map(([c]) => [c, palabras(d[c])])),
  }));
  return { productos, expira: Date.now() + VIGENCIA_MS };
}

export async function obtenerIndice() {
  if (indice && indice.expira > Date.now()) return indice.productos;
  if (!cargando) {
    cargando = cargarIndice()
      .then((nuevo) => {
        indice = nuevo;
        return nuevo;
      })
      .finally(() => {
        cargando = null;
      });
  }
  return (await cargando).productos;
}

// El admin creó, editó o borró un producto: la próxima consulta recarga la copia
export function invalidarIndiceBusqueda() {
  indice = null;
}

/**
 * Devuelve los _id (como string) de los productos que coinciden, del más al menos relevante.
 * Cada palabra buscada tiene que coincidir con algún campo (búsqueda "y").
 */
export async function buscarIdsProductos(texto) {
  const terminos = palabras(texto).slice(0, MAX_TERMINOS);
  if (!terminos.length) return [];

  const productos = await obtenerIndice();
  const consultaSku = comoSku(texto);
  const resultados = [];
  for (const producto of productos) {
    // El SKU completo (o su comienzo) gana aunque tenga guiones o espacios
    if (pareceSku(consultaSku) && producto.skuNorm.startsWith(consultaSku)) {
      const total = producto.skuNorm === consultaSku ? 1000 : 500;
      resultados.push({ id: String(producto._id), total, item: producto.item || "" });
      continue;
    }
    let total = 0;
    let coincideTodo = true;
    for (const termino of terminos) {
      const p = puntajeTermino(termino, producto);
      if (!p) {
        coincideTodo = false;
        break;
      }
      total += p;
    }
    if (coincideTodo) resultados.push({ id: String(producto._id), total, item: producto.item || "" });
  }
  resultados.sort((a, b) => b.total - a.total || a.item.localeCompare(b.item, "es"));
  return resultados.map((r) => r.id);
}

/**
 * Facetas para el filtro de productos: cantidades por categoría, subcategoría y marca.
 * Cada faceta se cuenta con los demás filtros aplicados, pero no con el suyo
 * (así se ven las otras opciones disponibles y cuántos productos tiene cada una).
 */
export async function calcularFacetas({ categoria, subcategoria, marca, soloOfertas, search } = {}) {
  let productos = await obtenerIndice();
  if (search) {
    const ids = new Set(await buscarIdsProductos(search));
    productos = productos.filter((p) => ids.has(String(p._id)));
  }
  if (soloOfertas) productos = productos.filter((p) => isOfertaVigente(p.oferta));

  const marcaNorm = marca ? normalizar(marca) : "";
  const coincide = {
    categoria: (p) => !categoria || p.categoria === categoria,
    subcategoria: (p) => !subcategoria || p.subcategoria === subcategoria,
    // Mismo criterio que el listado: la marca contiene lo buscado, sin distinguir mayúsculas
    marca: (p) => !marcaNorm || normalizar(p.marca).includes(marcaNorm),
  };
  const filtrar = (excepto) =>
    productos.filter((p) =>
      Object.entries(coincide).every(([clave, fn]) => clave === excepto || fn(p)),
    );
  const contar = (lista, campo) => {
    const mapa = new Map();
    for (const p of lista) {
      const valor = (p[campo] || "").trim();
      if (valor) mapa.set(valor, (mapa.get(valor) || 0) + 1);
    }
    return [...mapa]
      .map(([valor, cantidad]) => ({ valor, cantidad }))
      .sort((a, b) => a.valor.localeCompare(b.valor, "es"));
  };

  const todos = filtrar(null);
  return {
    total: todos.length,
    categorias: contar(filtrar("categoria"), "categoria"),
    // Las subcategorías solo tienen sentido dentro de una categoría
    subcategorias: categoria ? contar(filtrar("subcategoria"), "subcategoria") : [],
    marcas: contar(filtrar("marca"), "marca"),
    enOferta: todos.filter((p) => isOfertaVigente(p.oferta)).length,
    conStock: todos.filter((p) => p.stock > 0).length,
  };
}
