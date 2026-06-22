const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();
(async () => {
  const snap = await db.doc("sistema/choix_proyectos").get();
  console.log("existe?", snap.exists);
  console.log("tiene datosJSON?", !!(snap.data() && snap.data().datosJSON));
  const docs = await db.collection("sistema").listDocuments();
  console.log("listDocuments encontró:", docs.length, "→", docs.map(d => d.id));
  process.exit(0);
})();
