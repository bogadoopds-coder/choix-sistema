import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { mergeUocraRates, UOCRA_RATES_DEFAULT } from "../data/uocraRates";

// Thin wrapper around Firestore used by the current MVP.
// It preserves the existing JSON-blob contract:
//   collection: "sistema", document id: key, field: datosJSON (string).

export const storage = {
  async get(key) {
    try {
      const docRef = doc(db, "sistema", key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { value: docSnap.data().datosJSON };
      }
      return { value: null };
    } catch (error) {
      console.error("Error leyendo de Firebase:", error);
      return { value: null };
    }
  },

  async set(key, value) {
    try {
      const docRef = doc(db, "sistema", key);
      await setDoc(docRef, { datosJSON: value });
    } catch (error) {
      console.error("Error guardando en Firebase:", error);
    }
  },
};

const UOCRA_RATES_KEY = "choix_uocra_rates";

export async function getUocraRates() {
  try {
    const r = await storage.get(UOCRA_RATES_KEY);
    if (!r?.value) return mergeUocraRates({});
    const parsed = JSON.parse(r.value);
    if (typeof parsed !== "object" || parsed === null) return { ...UOCRA_RATES_DEFAULT };
    return mergeUocraRates(parsed);
  } catch {
    return mergeUocraRates({});
  }
}

export async function setUocraRates(rates) {
  const merged = mergeUocraRates(rates);
  await storage.set(UOCRA_RATES_KEY, JSON.stringify(merged));
  return merged;
}

