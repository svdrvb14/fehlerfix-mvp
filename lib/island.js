/**
 * "Meine Insel" – der Gamification-Bereich.
 *
 * Bewusst eine EIGENE Währung (coins), getrennt von points/Level: points
 * bleiben die reine, gemessene Lernstand-Kennzahl (siehe lib/mastery.js),
 * coins sind ausschließlich zum Freischalten von Insel-Gegenständen da.
 * Beide wachsen bei jeder Übung gleich schnell (siehe server.js), aber
 * ihre Bedeutung bleibt getrennt – kein Vermischen von "wie gut kannst du
 * das" mit "was hast du dir verdient".
 */

const ISLAND_ITEMS = [
  // Günstig
  { id: 'muschel', name: 'Muschel', icon: '🐚', category: 'Deko', cost: 10 },
  { id: 'blume', name: 'Blume', icon: '🌺', category: 'Pflanzen', cost: 15 },
  { id: 'palme', name: 'Palme', icon: '🌴', category: 'Pflanzen', cost: 20 },
  { id: 'krebs', name: 'Krebs', icon: '🦀', category: 'Tiere', cost: 25 },
  // Mittel
  { id: 'schildkroete', name: 'Schildkröte', icon: '🐢', category: 'Tiere', cost: 40 },
  { id: 'papagei', name: 'Papagei', icon: '🦜', category: 'Tiere', cost: 45 },
  { id: 'zelt', name: 'Zelt', icon: '⛺', category: 'Gebäude', cost: 50 },
  { id: 'boot', name: 'Boot', icon: '🛶', category: 'Gebäude', cost: 55 },
  // Highlights
  { id: 'delfin', name: 'Delfin', icon: '🐬', category: 'Tiere', cost: 80 },
  { id: 'flamingo', name: 'Flamingo', icon: '🦩', category: 'Tiere', cost: 85 },
  { id: 'huette', name: 'Strandhütte', icon: '🛖', category: 'Gebäude', cost: 100 },
  { id: 'leuchtturm', name: 'Leuchtturm', icon: '🗼', category: 'Gebäude', cost: 120 },
];

const BY_ID = Object.fromEntries(ISLAND_ITEMS.map((i) => [i.id, i]));

function catalog() {
  return ISLAND_ITEMS;
}

/**
 * Kauft einen Gegenstand: prüft den Preis, zieht Münzen ab, legt eine neue
 * Instanz auf die Insel (Mehrfachkauf desselben Gegenstands ist erlaubt –
 * mehrere Palmen sehen auf einer Insel gut aus).
 * @returns {{ok:true, coins:number, islandItems:array}|{ok:false, error:string}}
 */
function buy(state, itemId) {
  const item = BY_ID[itemId];
  if (!item) return { ok: false, error: 'Unbekannter Gegenstand.' };
  const coins = state.coins || 0;
  if (coins < item.cost) return { ok: false, error: 'Nicht genug Münzen.' };

  const islandItems = Array.isArray(state.islandItems) ? state.islandItems.slice() : [];
  islandItems.push({
    instanceId: `${itemId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemId,
    boughtAt: new Date().toISOString(),
  });

  return { ok: true, coins: coins - item.cost, islandItems };
}

module.exports = { ISLAND_ITEMS, catalog, buy };
