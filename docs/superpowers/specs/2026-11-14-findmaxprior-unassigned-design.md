# findMaxPrioR: Teilprioritäten & nicht unterbringbare Schüler

## Ziel und Hintergrund
Schüler vergeben künftig nur einen Teil der Prioritäten (Anzahl pro Projekt frei einstellbar).
Nicht gewählte Gruppen bedeuten „auf gar keinen Fall diese Gruppe“. Dadurch kann es trotz
ausreichender Gesamtkapazität vorkommen, dass nicht alle Schüler unterkommen. Teil 1 muss das
erkennen und melden, statt fälschlich `1` zurückzugeben. Grundlage für spätere Schritte:
Klassen-Ausschlüsse, Nachwahl, Teil 2 (Fehler = Summe der quadrierten Prioritäten minimieren).

## Ziele
- `findMaxPrioR` gibt `{ maxPrio: number, unassigned: string[] }` zurück.
- `maxPrio` = kleinstes R, bei dem bereits so viele Schüler unterkommen wie überhaupt möglich
  (Entscheidung A).
- `unassigned` = studentIds, die bei diesem R nicht untergebracht werden konnten (meist leer).
- Lücken in den Prioritäten (z. B. nur 1 und 3) funktionieren.

## Nicht-Ziele (kommen später)
Teil 2, Klassen-Ausschlüsse, Nachwahl, `guaranteedMinPrios`, Validierung der Eingabe
(doppelte Prioritäten/Gruppen), Gleichstände (mehrere Gruppen mit derselben Priorität).

## Anti-Ziel
Wer in `unassigned` landet, darf nicht nach einem systematischen Kriterium bestimmt werden. Es
hängt nur von der Reihenfolge der Eingabe ab, die `registrationAlgorithm` vorher zufällig mischt
(= Losverfahren).

## Ansätze
1. Bestehende `while`-Schleife erweitern: kleinster Diff, aber Funktion wird länger, Zuteilung
   bei festem R nicht einzeln test- oder wiederverwendbar.
2. **Gewählt:** Zuteilung in eigene Funktion `assignWithinR` ziehen; `findMaxPrioR` ruft sie
   pro R auf. Einzeln testbar, später direkt für die Nachwahl nutzbar.
3. Binärsuche über R: verworfen, bei wenigen Prioritäten kein Nutzen, schlechter lesbar.

## Design
- `export function assignWithinR(students, groupList, R): { groups: groups[], unassigned: string[] }`
  - Verändert `groupList` nicht (arbeitet auf `structuredClone`).
  - Pro Schüler: eigene `prefList`, gefiltert auf `preference <= R`, aufsteigend sortiert.
    Freie Gruppe → eintragen; volle Gruppe → `tryReAssign` (Verschieben bereits platzierter
    Schüler, bisherige Logik). Kein Erfolg → Schüler in `unassigned`.
  - `tryReAssign` wird aus der Schleife herausgezogen (Hilfsfunktion im Modul, nicht exportiert),
    nutzt ebenfalls die gefilterte, sortierte `prefList`.
- `export function findMaxPrioR(students, groupList): { maxPrio, unassigned }`
  - Obergrenze für R = höchste in den Daten vergebene Priorität (nicht mehr `groupList.length`).
  - Sobald bei einem R alle unterkommen → sofort zurückgeben.
  - Sonst: kleinstes R mit den wenigsten nicht Untergebrachten; `unassigned` aus diesem Lauf.
  - Keine Schüler oder keine Prioritäten → `{ maxPrio: 1, unassigned: [] }` bzw. alle Schüler
    ohne Prioritäten in `unassigned`.
- `registrationAlgorithm` an den neuen Rückgabetyp anpassen (nur Zugriff auf `.maxPrio`).

## Tests (zuerst schreiben)
- Bestehende Tests auf `.maxPrio` umstellen, zusätzlich `unassigned` leer.
- Lücken (nur Prio 1 und 3 vergeben).
- Beliebte Gruppen: 30 Plätze, alle wählen dieselben 4 Gruppen à 3 Plätze → 18 nicht unterbringbar.
- Teilweise lösbar: kleineres R bringt bereits genauso viele unter wie größtes → kleineres R.
- Schüler ohne Prioritäten → in `unassigned`.
- `assignWithinR`: hält R und Kapazität ein, verändert Eingabe nicht, Verschiebe-Kette funktioniert.
- Testdaten nur mit generischen IDs (keine personenbezogenen Daten).

## Dem Umsetzenden überlassen
Interne Benennung, ob zuerst bei R = max gerechnet wird, um die Bestzahl zu kennen, oder alle
R durchlaufen werden.
