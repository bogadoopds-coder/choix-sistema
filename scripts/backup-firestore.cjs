/** Backup SOLO LECTURA de Firestore. node scripts/backup-firestore.cjs */
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = path.join("backup", stamp);
fs.mkdirSync(OUT, { recursive: true });

function save(name, data) {
  const file = path.join(OUT, name + ".json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  console.log("  guardado:", file);
}

async function dumpCollection(collName) {
  console.log(`\nColeccion "${collName}":`);
  const docs = await db.collection(collName).listDocuments();
  if (docs.length === 0) { console.log("  (sin documentos)"); return; }
  for (const ref of docs) {
    const snap = await ref.get();
    if (snap.exists) save(`${collName}__${ref.id}`, snap.data());
    else console.log("  (vacio):", ref.id);
  }
}

async function dumpOrgs() {
  console.log(`\nArbol "orgs":`);
  const orgRefs = await db.collection("orgs").listDocuments();
  if (orgRefs.length === 0) { console.log("  (sin organizaciones)"); return; }
  for (const orgRef of orgRefs) {
    const orgSnap = await orgRef.get();
    save(`orgs__${orgRef.id}`, orgSnap.exists ? orgSnap.data() : {});
    const subcols = await orgRef.listCollections();
    for (const sub of subcols) {
      const subSnap = await sub.get();
      const rows = {};
      subSnap.forEach((d) => (rows[d.id] = d.data()));
      save(`orgs__${orgRef.id}__${sub.id}`, rows);
    }
  }
}

(async () => {
  try {
    console.log("== Backup de Firestore (solo lectura) ==");
    await dumpCollection("sistema");
    await dumpCollection("configuracion");
    await dumpOrgs();
    console.log(`\nListo. Backup en: ${OUT}`);
    process.exit(0);
  } catch (e) {
    console.error("\nError:", e.message);
    process.exit(1);
  }
})();
