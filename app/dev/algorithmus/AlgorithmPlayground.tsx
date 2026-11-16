"use client";

import { useState } from "react";
import {
  clampPopularity,
  compareK,
  generateGroups,
  generateRankings,
  KComparisonRow,
  runSimulation,
  SimGroup,
  SimulationResult,
} from "@/group-registration/simulation";

const cell = { border: "1px solid #ccc", padding: "2px 8px" };

/** Leere oder ungültige Zahlenfelder werden 0; negative Werte werden 0. */
function toCount(value: string): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function percent(part: number, total: number): string {
  return `${total > 0 ? ((part / total) * 100).toFixed(1) : "0.0"} %`;
}

export default function AlgorithmPlayground() {
  const [groupCount, setGroupCount] = useState(5);
  const [studentCount, setStudentCount] = useState(100);
  const [k, setK] = useState(3);
  const [randomCount, setRandomCount] = useState(false);
  const [groups, setGroups] = useState<SimGroup[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparison, setComparison] = useState<KComparisonRow[]>([]);
  const [usedK, setUsedK] = useState(0);

  const totalCapacity = groups.reduce((sum, g) => sum + g.capacity, 0);
  const groupNames = new Map(groups.map((g) => [g.groupId, g.name]));

  function createGroups() {
    setGroups(generateGroups(groupCount, studentCount));
    setResult(null);
    setComparison([]);
  }

  function updateGroup(index: number, change: Partial<SimGroup>) {
    setGroups(groups.map((g, i) => (i === index ? { ...g, ...change } : g)));
    setResult(null); // altes Ergebnis passt nicht mehr zu den geänderten Gruppen
    setComparison([]);
  }

  function simulate() {
    const effectiveK = Math.min(Math.max(k, 1), groups.length);
    const rankings = generateRankings(studentCount, groups);
    setUsedK(effectiveK);
    setResult(runSimulation(rankings, groups, effectiveK, randomCount));
    setComparison(compareK(rankings, groups, randomCount));
  }

  return (
    <main style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 1000 }}>
      <h1>Algorithmus-Test (nur Dev)</h1>

      <section>
        <h2>1. Einstellungen</h2>
        <label>
          Gruppen:{" "}
          <input type="number" min={0} value={groupCount} onChange={(e) => setGroupCount(toCount(e.target.value))} />
        </label>{" "}
        <label>
          Schüler:{" "}
          <input type="number" min={0} value={studentCount} onChange={(e) => setStudentCount(toCount(e.target.value))} />
        </label>{" "}
        <button onClick={createGroups}>Gruppen erzeugen</button>
        <p>
          <label>
            Erlaubte Prioritäten k (1 … {Math.max(groups.length, 1)}):{" "}
            <input type="number" min={1} max={Math.max(groups.length, 1)} value={k} onChange={(e) => setK(toCount(e.target.value))} />
          </label>{" "}
          <label>
            <input type="checkbox" checked={randomCount} onChange={(e) => setRandomCount(e.target.checked)} /> Zufällig 1 … k
            Prioritäten pro Schüler
          </label>
        </p>
      </section>

      {groups.length > 0 && (
        <section>
          <h2>2. Gruppen</h2>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={cell}>Name</th>
                <th style={cell}>Größe</th>
                <th style={cell}>Beliebtheit (1–10)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={g.groupId}>
                  <td style={cell}>{g.name}</td>
                  <td style={cell}>
                    <input type="number" min={0} value={g.capacity} onChange={(e) => updateGroup(i, { capacity: toCount(e.target.value) })} />
                  </td>
                  <td style={cell}>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={g.popularity}
                      onChange={(e) => updateGroup(i, { popularity: clampPopularity(Number(e.target.value)) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Plätze gesamt: {totalCapacity} / Schüler: {studentCount}
            {totalCapacity < studentCount && " – zu wenige Plätze!"}
          </p>
        </section>
      )}

      <button onClick={simulate} disabled={groups.length === 0} style={{ fontSize: 18, margin: "8px 0" }}>
        Simulieren
      </button>

      {result && (
        <section>
          <h2>3. Ergebnis (k = {usedK})</h2>
          <p>
            Laufzeit: <b>{result.durationMs.toFixed(2)} ms</b> · Zugeteilt: {result.assignedCount} · Nicht zugeteilt:{" "}
            {result.unassignedCount} · Schlechteste Priorität: {result.worstPriority ?? "–"}
          </p>

          <h3>Verteilung der Prioritäten</h3>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={cell}>Priorität</th>
                <th style={cell}>Schüler</th>
                <th style={cell}>Anteil</th>
              </tr>
            </thead>
            <tbody>
              {result.priorityCounts.map((count, i) => (
                <tr key={i}>
                  <td style={cell}>{i + 1}</td>
                  <td style={cell}>{count}</td>
                  <td style={cell}>{percent(count, result.studentCount)}</td>
                </tr>
              ))}
              <tr>
                <td style={cell}>nicht zugeteilt</td>
                <td style={cell}>{result.unassignedCount}</td>
                <td style={cell}>{percent(result.unassignedCount, result.studentCount)}</td>
              </tr>
            </tbody>
          </table>

          <h3>Vergleich: Wie viele Prioritäten wären sinnvoll?</h3>
          <p>Gleiche Schüler und Ranglisten, nur k ändert sich.</p>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={cell}>k</th>
                <th style={cell}>Nicht zugeteilt</th>
                <th style={cell}>Schlechteste Priorität</th>
                <th style={cell}>Laufzeit</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.k} style={{ fontWeight: row.k === usedK ? "bold" : "normal" }}>
                  <td style={cell}>{row.k}</td>
                  <td style={cell}>{row.unassignedCount}</td>
                  <td style={cell}>{row.worstPriority ?? "–"}</td>
                  <td style={cell}>{row.durationMs.toFixed(2)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Nicht zugeteilt ({result.assignment.unassigned.length})</h3>
          <p>{result.assignment.unassigned.join(", ") || "–"}</p>

          <h3>Zuteilung pro Gruppe</h3>
          {result.assignment.groups.map((g) => (
            <div key={g.groupId} style={{ marginBottom: 8 }}>
              <b>{groupNames.get(g.groupId) ?? g.groupId}</b> ({g.members.length}/{g.capacity})
              <div>{g.members.map((m) => `${m.studentId} (P${m.priority})`).join(", ") || "–"}</div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
