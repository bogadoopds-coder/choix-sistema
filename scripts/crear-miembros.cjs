/** Crea indice miembros/{uid} = { orgId, rol } a partir de orgs/{orgId}/usuarios. Aditivo. */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

(async () => {
  const orgs = await db.collection("orgs").listDocuments();
  let n = 0;
  for (const orgRef of orgs) {
    const usuarios = await db.collection(`orgs/${orgRef.id}/usuarios`).get();
    for (const u of usuarios.docs) {
      await db.doc(`miembros/${u.id}`).set({
        orgId: orgRef.id,
        rol: u.data().rol || null,
      });
      console.log(`  miembros/${u.id} -> orgId=${orgRef.id} rol=${u.data().rol}`);
      n++;
    }
  }
  console.log(`\nListo. ${n} miembro(s) indexado(s).`);
  process.exit(0);
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
