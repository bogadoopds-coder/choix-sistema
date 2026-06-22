import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lee las obras del schema normalizado (orgs/{orgId}/obras/...) y las
 * devuelve con items[] y certificaciones[] embebidos, con la MISMA forma
 * que tenia el blob viejo (choix_proyectos). Asi los modulos no cambian
 * su logica: solo cambia de donde sale el dato.
 */
export async function getObras(orgId) {
  if (!orgId) return [];
  const obrasSnap = await getDocs(collection(db, "orgs", orgId, "obras"));
  return Promise.all(
    obrasSnap.docs.map(async (obraDoc) => {
      const [itemsSnap, certsSnap] = await Promise.all([
        getDocs(collection(db, "orgs", orgId, "obras", obraDoc.id, "items")),
        getDocs(collection(db, "orgs", orgId, "obras", obraDoc.id, "certificaciones")),
      ]);
      return {
        id: obraDoc.id,
        ...obraDoc.data(),
        items: itemsSnap.docs.map((d) => d.data()),
        certificaciones: certsSnap.docs.map((d) => d.data()),
      };
    })
  );
}
