export type Stock = { id: string; materialId: number; location: string; quantity: number; packed: number; sourceIds?: string[] };
export type Material = { id: number; name: string; unit: string; stock: number; note: string; consumable: number; memberIds: number[]; stocks: Stock[] };
export type Need = { id: number; materialId: number; quantity: number; date: string; period: string; unitName: string; person: string; project: string; startTime: string; endTime: string };
export const periods = ["Vormittags", "Mittagspause", "Nachmittags", "Abends", "Ganztags"];
export const keyForName = (name: string) => name.trim().toLocaleLowerCase("de");
export function consolidateMaterials(raw: Array<{ id: number; name: string; unit: string; stock: number; location: string; note: string; packed: number; consumable: number }>, stocks: Stock[]) {
  const groups = new Map<string, Material>();
  const aliases = new Map<number, number>();
  for (const row of [...raw].sort((a, b) => a.id - b.id)) {
    const key = keyForName(row.name);
    let material = groups.get(key);
    if (!material) {
      material = { id: row.id, name: row.name, unit: row.unit, stock: 0, note: row.note, consumable: row.consumable, memberIds: [], stocks: [] };
      groups.set(key, material);
    }
    aliases.set(row.id, material.id); material.memberIds.push(row.id);
    material.consumable = material.consumable || row.consumable;
    const holdings = stocks.filter(s => s.materialId === row.id);
    const resolved = holdings.length ? holdings : row.stock > 0 ? [{ id: `legacy-${row.id}`, materialId: row.id, location: row.location, quantity: row.stock, packed: row.packed }] : [];
    material.stocks.push(...resolved.map(s => ({ ...s, materialId: material!.id })));
    material.stock += resolved.reduce((sum, s) => sum + s.quantity, 0);
  }
  for (const material of groups.values()) {
    const byLocation = new Map<string, Stock>();
    for (const stock of material.stocks) {
      const key = keyForName(stock.location), previous = byLocation.get(key);
      if (previous) {
        previous.quantity += stock.quantity;
        previous.packed = previous.packed && stock.packed ? 1 : 0;
        previous.sourceIds!.push(stock.id);
      } else byLocation.set(key, { ...stock, sourceIds: [stock.id] });
    }
    material.stocks = [...byLocation.values()];
  }
  return { materials: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "de")), aliases };
}
export function timeRange(n: Pick<Need, "startTime" | "endTime" | "period">): [number, number] {
  const minutes = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  if (n.startTime && n.endTime) return [minutes(n.startTime), minutes(n.endTime)];
  return ({ Vormittags: [0, 720], Mittagspause: [720, 840], Nachmittags: [840, 1080], Abends: [1080, 1440], Ganztags: [0, 1440] } as Record<string, [number, number]>)[n.period] || [0, 1440];
}
export function planMaterial(m: Material, needs: Need[]) {
  const rows = needs.filter(n => n.materialId === m.id);
  let peak = 0;
  for (const date of new Set(rows.map(n => n.date))) {
    const events = rows.filter(n => n.date === date).flatMap(n => { const [start, end] = timeRange(n); return [{ at: start, delta: n.quantity }, { at: end, delta: -n.quantity }]; });
    events.sort((a, b) => a.at - b.at || a.delta - b.delta);
    let current = 0;
    for (const event of events) { current += event.delta; peak = Math.max(peak, current); }
  }
  const requested = rows.reduce((sum, n) => sum + n.quantity, 0);
  const required = m.consumable ? requested : peak;
  let remaining = required;
  const stockPositions = [...m.stocks].sort((a, b) => (a.location || "~").localeCompare(b.location || "~", "de") || a.id.localeCompare(b.id)).map(stock => {
    const quantity = Math.min(stock.quantity, remaining); remaining -= quantity;
    return { ...stock, quantity, available: stock.quantity, name: m.name, unit: m.unit, required };
  });
  const allocations = stockPositions.filter(s => s.quantity > 0);
  return { ...m, peak, requested, required, shortfall: Math.max(0, required - m.stock), allocations, stockPositions };
}
