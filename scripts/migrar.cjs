/** Migracion ADITIVA blob -> schema normalizado. No borra nada. Re-ejecutable. */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: cert(require("../serviceAccountKey.json")) });
const db = getFirestore();

const ORG_ID = "dhyIDuoYmezMRvLTIMV1";

async function commitChunked(ref, items, makeId, label) {
  let i = 0;
  while (i < items.length) {
    const batch = db.batch();
    const slice = items.slice(i, i + 400);
    slice.forEach((obj, k) => batch.set(ref.doc(makeId(obj, i + k)), obj));
    await batch.commit();
    i += slice.length;
  }
  console.log(`      ${label}: ${items.length} escritos`);
}

async function main() {
  console.log("== Migracion aditiva a orgs/" + ORG_ID + " ==");

  // 1) OBRAS
  const snap = await db.doc("sistema/choix_proyectos").get();
  const obras = JSON.parse((snap.data() && snap.data().datosJSON) || "[]");
  console.log("\nObras en el blob:", obras.length);

  for (const obra of obras) {
    if (!obra.id) { console.warn("  (sin id, salteada):", obra.codigo); continue; }
    const obraRef = db.doc(`orgs/${ORG_ID}/obras/${obra.id}`);

    await obraRef.set({
      codigo: obra.codigo ?? null,
      nombre: obra.nombre ?? null,
      cliente: obra.cliente ?? null,
      fechaInicio: obra.fechaInicio ?? null,
      fechaFin: obra.fechaFin ?? null,
      iccPct: obra.iccPct ?? 0,
      activo: obra.activo !== false,
      creadoEn: obra.creadoEn ?? null,
    });
    console.log(`\n  Obra ${obra.codigo} "${obra.nombre}" -> ${obra.id}`);

    const items = obra.items || [];
    if (items.length)
      await commitChunked(obraRef.collection("items"), items,
        (_it, idx) => "it-" + String(idx).padStart(4, "0"), "items");

    const certs = obra.certificaciones || [];
    if (certs.length)
      await commitChunked(obraRef.collection("certificaciones"), certs,
        (c, idx) => c.id || ("cert-" + String(idx).padStart(3, "0")), "certificaciones");
  }

  // 2) PRECIOS APRENDIDOS
  const pa = await db.doc("configuracion/preciosAprendidos").get();
  if (pa.exists) {
    await db.doc(`orgs/${ORG_ID}/config/preciosAprendidos`).set(pa.data());
    console.log(`\n  preciosAprendidos -> orgs/${ORG_ID}/config (items: ${(pa.data().items || []).length})`);
  }

  // 3) VERIFICACION (solo lectura)
  console.log("\n-- Verificacion --");
  const obrasSnap = await db.collection(`orgs/${ORG_ID}/obras`).get();
  for (const d of obrasSnap.docs) {
    const its = await db.collection(`orgs/${ORG_ID}/obras/${d.id}/items`).get();
    const crt = await db.collection(`orgs/${ORG_ID}/obras/${d.id}/certificaciones`).get();
    console.log(`  ${d.data().codigo} "${d.data().nombre}": items=${its.size} certs=${crt.size}`);
  }
  console.log("\nListo. Estructura nueva creada. Los blobs viejos NO fueron tocados.");
  process.exit(0);
}

main().catch((e) => { console.error("\nError:", e.message); process.exit(1); });
