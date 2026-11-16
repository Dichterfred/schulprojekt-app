# Algorithmus-Test-Seite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine nur in Dev erreichbare Seite `/dev/algorithmus`, die Zufallsgruppen und -schüler erzeugt, `registrationAlgorithm` laufen lässt und Zuteilung, Prioritäten-Verteilung, Übriggebliebene, Laufzeit und einen *k*-Vergleich anzeigt.

**Architecture:** Alles läuft im Browser. Reine Logik (Erzeugen + Auswerten) liegt in `group-registration/simulation.ts` und ist mit Vitest getestet; die Seite ist eine dünne Server-Komponente (404 in Prod) plus eine Client-Komponente ohne eigene Logik außer State und Darstellung.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-11-16-algorithm-test-page-design.md`

## Global Constraints

- Branch: `algorithm-test-page`.
- In Prod nicht erreichbar: bei `process.env.NODE_ENV === "production"` → `notFound()`.
- Keine personenbezogenen Daten: Schüler-IDs `"Schüler 1"`, `"Schüler 2"`, …; Gruppennamen erfundene Kombinationen Adjektiv + Tier/Thema (z. B. „Rote Füchse“).
- Kein Styling-Aufwand, keine neuen Dependencies, keine API/DB.
- `registrationAlgorithm` und `groupRegistration.ts` werden nicht verändert.
- Abweichung vom Spec-Dateinamen: Die Logikdatei heißt `group-registration/simulation.ts` statt `testData.ts`, damit sie nicht mit `tests/testData/` verwechselt wird.

## Review Focus

1. **Gesamtkapazität < Schülerzahl** → Algorithmus läuft durch, die überzähligen erscheinen in „Nicht zugeteilt“ (Test in Task 2).
2. ***k* größer als Gruppenanzahl** (z. B. Gruppenanzahl nachträglich verkleinert) → *k* wird auf 1 … Gruppenanzahl begrenzt (Test in Task 1 für `toStudentChoices`, Clamp in Task 3).
3. **Beliebtheit 0, leer oder > 10** im Eingabefeld → wird auf 1 … 10 begrenzt, kein `Infinity`/`NaN` im Ranking (Test in Task 1).
4. **0 Schüler oder 0 Gruppen** → kein Absturz, leeres Ergebnis (Test in Task 2; Button in Task 3 bei 0 Gruppen deaktiviert).
5. **„Zufällig 1 … k“ im k-Vergleich** → die Anzahl je Schüler darf mit wachsendem *k* nur wachsen, nie schrumpfen (Test in Task 1).

---

### Task 1: Erzeugen von Gruppen, Ranglisten und Wahlen

**Files:**
- Create: `group-registration/simulation.ts`
- Test: `tests/simulation.test.ts`

**Interfaces:**
- Consumes: `StudentChoices`, `RegistrationGroup` aus `group-registration/groupRegistration.ts`
- Produces:
  ```ts
  export type Random = () => number // [0, 1), Standard Math.random
  export interface SimGroup { groupId: string, name: string, capacity: number, popularity: number }
  export interface StudentRanking { studentId: string, ranking: string[] /* alle groupIds, beste zuerst */, countFraction: number /* (0, 1] */ }
  export function clampPopularity(value: number): number            // auf ganze Zahl 1 … 10, NaN → 1
  export function generateGroups(count: number, studentCount: number, random?: Random): SimGroup[]
  export function generateRankings(studentCount: number, groups: SimGroup[], random?: Random): StudentRanking[]
  export function toStudentChoices(rankings: StudentRanking[], k: number, randomCount: boolean): StudentChoices[]
  export function toRegistrationGroups(groups: SimGroup[]): RegistrationGroup[]
  ```

- [ ] **Step 1: Write the failing tests** in `tests/simulation.test.ts`:

```ts
describe("generateGroups", () => {
    it("erzeugt count Gruppen mit eindeutigen IDs, Kapazität ceil(Schüler/Gruppen), Beliebtheit 5", () => {
        const groups = generateGroups(3, 10)
        expect(groups).toHaveLength(3)
        expect(new Set(groups.map(g => g.groupId)).size).toBe(3)
        expect(groups.every(g => g.capacity === 4 && g.popularity === 5)).toBe(true)
        expect(groups.every(g => g.name.length > 0)).toBe(true)
    })
    it("liefert bei 0 Gruppen ein leeres Array", () => {
        expect(generateGroups(0, 10)).toEqual([])
    })
})

describe("clampPopularity", () => {
    it("begrenzt auf 1 … 10", () => {
        expect([0, -3, 11, NaN, 4.6].map(clampPopularity)).toEqual([1, 1, 10, 1, 5])
    })
})

describe("generateRankings", () => {
    it("jeder Schüler rankt jede Gruppe genau einmal, IDs 'Schüler 1' …", () => {
        const groups = generateGroups(4, 6)
        const rankings = generateRankings(6, groups)
        expect(rankings.map(r => r.studentId)).toEqual(["Schüler 1", "Schüler 2", "Schüler 3", "Schüler 4", "Schüler 5", "Schüler 6"])
        for (const r of rankings) {
            expect([...r.ranking].sort()).toEqual(groups.map(g => g.groupId).sort())
            expect(r.countFraction).toBeGreaterThan(0)
            expect(r.countFraction).toBeLessThanOrEqual(1)
        }
    })
    it("beliebtere Gruppe landet deutlich öfter auf Platz 1", () => {
        const groups = generateGroups(2, 2000)
        groups[0].popularity = 10
        groups[1].popularity = 1
        const firsts = generateRankings(2000, groups).filter(r => r.ranking[0] === groups[0].groupId).length
        expect(firsts).toBeGreaterThan(1600) // erwartet ≈ 10/11 ≈ 1818
    })
    it("Beliebtheit 0 erzeugt keine kaputte Rangliste", () => {
        const groups = generateGroups(3, 5)
        groups[1].popularity = 0
        for (const r of generateRankings(5, groups)) expect(r.ranking).toHaveLength(3)
    })
})

describe("toStudentChoices", () => {
    const rankings: StudentRanking[] = [
        {studentId: "Schüler 1", ranking: ["a", "b", "c"], countFraction: 0.4},
    ]
    it("genau k: erste k Plätze als Priorität 1, 2, …", () => {
        expect(toStudentChoices(rankings, 2, false)[0].choices)
            .toEqual([{groupId: "a", priority: 1}, {groupId: "b", priority: 2}])
    })
    it("k größer als Gruppenanzahl wird auf die Ranglistenlänge begrenzt", () => {
        expect(toStudentChoices(rankings, 5, false)[0].choices).toHaveLength(3)
    })
    it("zufällig: Anzahl = max(1, ceil(countFraction * k)) und wächst monoton mit k", () => {
        const counts = [1, 2, 3].map(k => toStudentChoices(rankings, k, true)[0].choices.length)
        expect(counts).toEqual([1, 1, 2])
    })
})

describe("toRegistrationGroups", () => {
    it("übernimmt ID und Kapazität, leere Mitglieder, full=false", () => {
        expect(toRegistrationGroups([{groupId: "a", name: "X", capacity: 2, popularity: 5}]))
            .toEqual([{groupId: "a", capacity: 2, members: [], full: false}])
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/simulation.test.ts`
Expected: FAIL – Modul `../group-registration/simulation` nicht gefunden.

- [ ] **Step 3: Implement `group-registration/simulation.ts`** mit den Signaturen aus dem Interfaces-Block.
  - `groupId`: `"g1"`, `"g2"`, …; `name`: Adjektiv + Nomen aus zwei kleinen festen Listen, per `random` gezogen (Duplikate erlaubt, die ID ist eindeutig). Kapazität `Math.ceil(studentCount / count)`, mindestens 1.
  - `generateRankings`: gewichtetes Ziehen ohne Zurücklegen nach Efraimidis–Spirakis – pro Gruppe `key = random() ** (1 / clampPopularity(popularity))`, absteigend nach `key` sortieren. `countFraction = 1 - random()` (liegt in (0, 1]). `projectId` beim Umwandeln: `"test"`.
  - `toStudentChoices`: `n = randomCount ? Math.max(1, Math.ceil(countFraction * k)) : k`, dann `Math.min(n, ranking.length)`.
  - **Abweichung vom Spec:** Statt „Anzahl einmal würfeln und auf *k* kappen“ wird ein Bruchteil gewürfelt und mit *k* skaliert, damit im *k*-Vergleich die Anzahl mit *k* mitwächst (sonst wäre sie durch das aktuell eingestellte *k* nach oben gedeckelt).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: alle Tests PASS (auch die bestehenden 36).

- [ ] **Step 5: Commit**

```bash
git add group-registration/simulation.ts tests/simulation.test.ts
git commit -m "Add simulation data generation for algorithm test page"
```

---

### Task 2: Simulation ausführen und auswerten

**Files:**
- Modify: `group-registration/simulation.ts`
- Test: `tests/simulation.test.ts`

**Interfaces:**
- Consumes: alles aus Task 1, `registrationAlgorithm`, `AssignmentResult`
- Produces:
  ```ts
  export interface SimulationResult {
      assignment: AssignmentResult,
      durationMs: number,
      priorityCounts: number[],   // Index i = Anzahl Schüler mit Priorität i+1; Länge = k
      assignedCount: number,
      unassignedCount: number,
      worstPriority: number | null, // höchste vergebene Priorität, null wenn niemand zugeteilt
  }
  export interface KComparisonRow { k: number, unassignedCount: number, worstPriority: number | null, durationMs: number }
  export function runSimulation(rankings: StudentRanking[], groups: SimGroup[], k: number, randomCount: boolean): SimulationResult
  export function compareK(rankings: StudentRanking[], groups: SimGroup[], randomCount: boolean): KComparisonRow[] // k = 1 … groups.length
  ```

- [ ] **Step 1: Write the failing tests** (an `tests/simulation.test.ts` anhängen):

```ts
describe("runSimulation", () => {
    const groups: SimGroup[] = [
        {groupId: "a", name: "A", capacity: 1, popularity: 5},
        {groupId: "b", name: "B", capacity: 1, popularity: 5},
    ]
    const rankings: StudentRanking[] = [
        {studentId: "Schüler 1", ranking: ["a", "b"], countFraction: 1},
        {studentId: "Schüler 2", ranking: ["a", "b"], countFraction: 1},
        {studentId: "Schüler 3", ranking: ["a", "b"], countFraction: 1},
    ]
    it("zählt Prioritäten, Übriggebliebene und misst die Zeit", () => {
        const r = runSimulation(rankings, groups, 2, false)
        expect(r.priorityCounts).toEqual([1, 1])
        expect(r.assignedCount).toBe(2)
        expect(r.unassignedCount).toBe(1)
        expect(r.assignment.unassigned).toHaveLength(1)
        expect(r.worstPriority).toBe(2)
        expect(r.durationMs).toBeGreaterThanOrEqual(0)
    })
    it("läuft mit 0 Schülern und mit 0 Gruppen ohne Fehler", () => {
        expect(runSimulation([], groups, 1, false).assignedCount).toBe(0)
        const noGroups = runSimulation(rankings.map(r => ({...r, ranking: []})), [], 1, false)
        expect(noGroups.unassignedCount).toBe(3)
        expect(noGroups.worstPriority).toBeNull()
    })
})

describe("compareK", () => {
    it("eine Zeile pro k = 1 … Gruppenanzahl, mehr Prioritäten → nicht mehr Übriggebliebene", () => {
        const groups: SimGroup[] = [
            {groupId: "a", name: "A", capacity: 1, popularity: 5},
            {groupId: "b", name: "B", capacity: 1, popularity: 5},
        ]
        const rankings: StudentRanking[] = [
            {studentId: "Schüler 1", ranking: ["a", "b"], countFraction: 1},
            {studentId: "Schüler 2", ranking: ["a", "b"], countFraction: 1},
        ]
        const rows = compareK(rankings, groups, false)
        expect(rows.map(r => r.k)).toEqual([1, 2])
        expect(rows.map(r => r.unassignedCount)).toEqual([1, 0])
        expect(rows.map(r => r.worstPriority)).toEqual([1, 2])
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/simulation.test.ts`
Expected: FAIL – `runSimulation` / `compareK` nicht exportiert.

- [ ] **Step 3: Implement `runSimulation` and `compareK`** in `group-registration/simulation.ts`.
  - Zeitmessung mit `performance.now()` **nur** um `registrationAlgorithm(toStudentChoices(...), toRegistrationGroups(groups))`.
  - Prioritäten aus `assignment.groups[].members[].priority` zählen.
  - Falls `registrationAlgorithm` bei 0 Schülern oder 0 Gruppen wirft oder hängt: in `runSimulation` vorher abfangen (0 Schüler → alles leer; 0 Gruppen → alle unassigned) statt den Algorithmus zu ändern.
  - `compareK` ruft `runSimulation` für k = 1 … `groups.length` auf.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: alle Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add group-registration/simulation.ts tests/simulation.test.ts
git commit -m "Add simulation runner and k comparison"
```

---

### Task 3: Dev-Seite `/dev/algorithmus`

**Files:**
- Create: `app/dev/algorithmus/page.tsx`
- Create: `app/dev/algorithmus/AlgorithmPlayground.tsx`

**Interfaces:**
- Consumes: `generateGroups`, `generateRankings`, `runSimulation`, `compareK`, `clampPopularity`, `SimGroup`, `SimulationResult`, `KComparisonRow` aus Task 1/2

- [ ] **Step 1: `page.tsx`** – Server-Komponente: `if (process.env.NODE_ENV === "production") notFound()` (aus `next/navigation`), sonst `<AlgorithmPlayground />`.

- [ ] **Step 2: `AlgorithmPlayground.tsx`** (`"use client"`, schlichtes HTML, Inline-Styles nur wo nötig):
  - Eingaben: Gruppenanzahl (Standard 5), Schülerzahl (Standard 100), *k* (Standard 3), Checkbox „Zufällig 1 … k Prioritäten pro Schüler“.
  - Button **„Gruppen erzeugen“** → `generateGroups(gruppen, schüler)`; ersetzt die Gruppentabelle (eigene Anpassungen gehen dabei bewusst verloren).
  - Gruppentabelle: Name, Kapazität (Zahl ≥ 0), Beliebtheit (Zahl 1 … 10, beim Ändern `clampPopularity`). Darunter Summe der Kapazitäten vs. Schülerzahl.
  - Button **„Simulieren“** (deaktiviert ohne Gruppen) → `generateRankings` neu, dann `runSimulation` mit `k` auf 1 … Gruppenanzahl begrenzt, und `compareK`.
  - Ergebnis:
    1. Laufzeit in ms (2 Nachkommastellen), Zugeteilt / Nicht zugeteilt, schlechteste Priorität.
    2. Tabelle Priorität → Anzahl Schüler (+ Prozent).
    3. Tabelle *k*-Vergleich: k, nicht zugeteilt, schlechteste Priorität, Laufzeit; Zeile des eingestellten *k* fett.
    4. Liste der nicht zugeteilten Schüler.
    5. Pro Gruppe: Name, belegt/Kapazität, Mitglieder mit Priorität (z. B. `Schüler 17 (P2)`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler in den neuen Dateien (bestehende Fehler anderswo notieren, nicht beheben).

- [ ] **Step 4: Manuell in Dev prüfen**

Run: `npm run dev`, dann `http://localhost:3111/dev/algorithmus` öffnen.
Expected: Gruppen erzeugen, Größe/Beliebtheit ändern, Simulieren zeigt alle fünf Ergebnisblöcke; Gruppenanzahl auf 2 bei k = 3 → läuft mit k = 2. Kapazität-Summe < Schüler → Übriggebliebene werden gelistet.

- [ ] **Step 5: Prod-Sperre prüfen**

Run: `npx next build && npx next start -p 3112`, dann `curl -s -o /dev/null -w "%{http_code}" http://localhost:3112/dev/algorithmus`
Expected: `404`. (Nicht `npm run build` – das führt `prisma migrate deploy` aus.) Falls der Build an fremden Seiten scheitert, stattdessen den Code-Pfad begründen und im Abschluss melden.

- [ ] **Step 6: Commit**

```bash
git add app/dev/algorithmus/page.tsx app/dev/algorithmus/AlgorithmPlayground.tsx
git commit -m "Add dev-only algorithm test page"
```
