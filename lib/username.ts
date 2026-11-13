const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Normalisiert einen Namensteil: klein, Umlaute ersetzt, Akzente entfernt, nur a-z0-9 und "-". */
function slugifyPart(input: string): string {
  const lower = input.toLowerCase().replace(/[äöüß]/g, (c) => UMLAUTS[c] ?? c);
  const ascii = lower.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return ascii
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Erzeugt "vorname.nachname"; leer, wenn ein Teil nach dem Normalisieren leer ist. */
export function buildUsernameBase(firstName: string, lastName: string): string {
  const first = slugifyPart(firstName);
  const last = slugifyPart(lastName);
  return first && last ? `${first}.${last}` : "";
}

/** Hängt bei Kollision 2, 3, … an (max.mueller, max.mueller2, …). */
export function withNumberSuffix(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Vergibt eindeutige Anmeldenamen und trägt sie in `taken` ein (auch innerhalb des Batches). */
export function assignUsernames<T extends { firstName: string; lastName: string }>(
  people: T[],
  taken: Set<string>,
): (T & { username: string })[] {
  return people.map((person) => {
    const username = withNumberSuffix(buildUsernameBase(person.firstName, person.lastName), taken);
    taken.add(username);
    return { ...person, username };
  });
}

/** Vereinheitlicht eine Eingabe beim Login. */
export function normalizeLoginName(input: string): string {
  return input.trim().toLowerCase();
}
