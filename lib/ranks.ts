// Vergibt die Ränge 1..n lückenlos und liefert nur die tatsächlich geänderten.
export function compactRanks<T extends { id: string; rank: number }>(
  prefs: T[],
): { id: string; from: number; to: number }[] {
  return [...prefs]
    .sort((a, b) => a.rank - b.rank)
    .map((p, i) => ({ id: p.id, from: p.rank, to: i + 1 }))
    .filter((c) => c.from !== c.to);
}
