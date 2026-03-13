// Match budget items to rendimiento catalog (description + unit) for duration estimate.

function normalize(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function tokenize(s) {
  const n = normalize(s);
  if (!n) return [];
  return n.split(/\s+/).filter((w) => w.length > 0);
}

function wordOverlapCount(wordsA, wordsB) {
  const setB = new Set(wordsB);
  return wordsA.filter((w) => setB.has(w)).length;
}

/**
 * Find best matching rendimiento entry for (desc, um). Prefers same unit, then highest word overlap.
 * Returns full entry { rendimiento, crewId?, ... } or null.
 */
export function getRendimientoMatch(desc, um, catalog) {
  if (!catalog || !Array.isArray(catalog) || catalog.length === 0) return null;
  const tokensDesc = tokenize(desc);
  if (tokensDesc.length === 0) return null;
  const nUm = normalize(um) || "un";
  const sameUnit = catalog.filter((r) => normalize(r.um) === nUm);
  const otherUnit = catalog.filter((r) => normalize(r.um) !== nUm);
  let best = null;
  let bestOverlap = 0;
  for (const r of sameUnit) {
    const tokensR = tokenize(r.desc);
    const overlap = wordOverlapCount(tokensDesc, tokensR);
    if (overlap > 0 && overlap >= bestOverlap) {
      bestOverlap = overlap;
      best = r;
    }
  }
  if (best) return best;
  for (const r of otherUnit) {
    const tokensR = tokenize(r.desc);
    const overlap = wordOverlapCount(tokensDesc, tokensR);
    if (overlap > 0 && overlap >= bestOverlap) {
      bestOverlap = overlap;
      best = r;
    }
  }
  return best;
}

/**
 * Find best matching rendimiento for (desc, um). Returns rendimiento (units per day) or null.
 */
export function getRendimiento(desc, um, catalog) {
  const match = getRendimientoMatch(desc, um, catalog);
  return match ? match.rendimiento : null;
}
