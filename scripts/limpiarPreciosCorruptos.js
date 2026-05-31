/**
 * Script de uso único: limpia ítems corruptos en precios aprendidos (Firestore).
 *
 * Ejecución (desde la raíz del repo):
 *   node scripts/limpiarPreciosCorruptos.js
 *
 * Requiere VITE_FIREBASE_API_KEY en el entorno o en un archivo .env en la raíz.
 * No ejecutar en CI sin revisar antes la ruta del documento (ver COLLECTION / DOC_ID abajo).
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFromDotenv() {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  const txt = readFileSync(envPath, "utf8");
  for (const line of txt.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = val;
  }
}

loadEnvFromDotenv();

/** Misma config que src/firebase.js (apiKey desde entorno). */
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "choix-sistemaintegradodeobras.firebaseapp.com",
  projectId: "choix-sistemaintegradodeobras",
  storageBucket: "choix-sistemaintegradodeobras.firebasestorage.app",
  messagingSenderId: "637059483811",
  appId: "1:637059483811:web:86fb1a38abea98661d5716",
};

/**
 * Documento con array `items` de precios aprendidos.
 * Si en tu proyecto los datos están en `configuracion/preciosAprendidos`, cambiá estos dos valores.
 */
const COLLECTION = "configuracion";
const DOC_ID = "preciosAprendidos";

function itemIsValid(item) {
  const pu = Number(item?.precioUnitario);
  if (!(pu > 100)) return false;
  const desc = String(item?.descripcion ?? "").trim();
  if (desc.length <= 10) return false;
  // Ej: "1 Cerco", "2 Desmonte" — número al inicio seguido de espacio
  if (/^\d+\s/.test(desc)) return false;
  return true;
}

async function main() {
  if (!firebaseConfig.apiKey) {
    console.error("Falta VITE_FIREBASE_API_KEY (exportá la variable o definila en .env en la raíz).");
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const docRef = doc(db, COLLECTION, DOC_ID);

  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.error(`No existe el documento ${COLLECTION}/${DOC_ID}`);
    process.exit(1);
  }

  const data = snap.data();
  const items = Array.isArray(data.items) ? data.items : [];
  const antes = items.length;
  const filtrados = items.filter(itemIsValid);
  const despues = filtrados.length;
  const eliminados = antes - despues;

  await updateDoc(docRef, { items: filtrados });

  console.log("--- limpiarPreciosCorruptos ---");
  console.log("Documento:", `${COLLECTION}/${DOC_ID}`);
  console.log("Ítems antes:", antes);
  console.log("Ítems eliminados:", eliminados);
  console.log("Ítems que quedaron:", despues);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
