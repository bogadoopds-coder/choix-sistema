import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

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

