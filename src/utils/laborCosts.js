/**
 * Labor cost estimation: crew daily cost and unit/total MO from rendimiento.
 */

/**
 * Crew daily cost = sum of (qty * worker daily cost) for each role in the crew.
 */
export function getCrewDailyCost(crewId, crews, workerDailyCost) {
  const crew = crews && crewId ? crews[crewId] : null;
  if (!crew || !Array.isArray(crew) || !workerDailyCost) return 0;
  return crew.reduce((sum, { role, qty }) => sum + (workerDailyCost[role] ?? 0) * (qty ?? 0), 0);
}

/**
 * Labor unit cost = crew daily cost / rendimiento (cost per unit when rendimiento is units/day).
 */
export function getLaborUnitCost(crewDailyCost, rendimiento) {
  if (rendimiento == null || rendimiento <= 0) return null;
  return crewDailyCost / rendimiento;
}

/**
 * Labor total cost = labor unit cost * quantity.
 */
export function getLaborTotalCost(laborUnitCost, quantity) {
  if (laborUnitCost == null || quantity == null) return null;
  return laborUnitCost * quantity;
}
