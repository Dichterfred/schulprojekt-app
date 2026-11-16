# Test-Seite für den Zuteilungsalgorithmus

## Wozu
Eine schlichte Entwickler-Seite, um `registrationAlgorithm` mit Zufallsdaten auszuprobieren:
Wie gut verteilt er, wie viele bleiben übrig, waren die erlaubten Prioritäten zu wenige
oder zu viele, und wie schnell ist er. Optik ist egal.

## Ziele
- Eingaben: Anzahl Gruppen, Anzahl Schüler, Anzahl erlaubter Prioritäten *k* (1 … Gruppenanzahl),
  Schalter „genau *k*“ (Standard) / „zufällig 1 … *k*“ pro Schüler.
- Gruppen werden mit zufälligen Namen erzeugt; pro Gruppe einstellbar: Größe (Kapazität) und Beliebtheit.
- Button „Simulieren“: Schüler werden erzeugt, wählen zufällig unter Berücksichtigung der Beliebtheit,
  dann läuft der Algorithmus.
- Ergebnis:
  - Zuteilung pro Gruppe (Mitglieder mit ihrer Priorität, belegt/Kapazität)
  - Verteilung: wie viele Schüler bekamen Priorität 1, 2, 3, …
  - Liste der nicht zugeteilten Schüler
  - Laufzeit von `registrationAlgorithm` (nur der Aufruf, ohne Datenerzeugung)
  - Vergleich *k* = 1 … Gruppenanzahl mit denselben Schülern: übrig gebliebene, schlechteste
    vergebene Priorität, Laufzeit – zeigt, ob mehr Prioritäten weniger Übriggebliebene gebracht hätten

## Nicht-Ziele
- Keine Datenbank, keine API, kein Login, kein Speichern von Szenarien.
- Kein schönes Design, keine Web-Worker (kann später nachgerüstet werden).

## Randbedingungen
- In Prod nicht erreichbar: Seite liefert bei `NODE_ENV === "production"` `notFound()` (404).
- Keine personenbezogenen Daten: Schüler heißen „Schüler 1“, „Schüler 2“ …; Gruppennamen sind
  erfundene Kombinationen (z. B. Adjektiv + Tier/Thema), keine echten Namen.
- Eigener Branch `algorithm-test-page` (abgezweigt von `group-registration-algorithm`).

## Ansätze
- **A) Alles im Browser – gewählt.** Client-Komponente ruft `registrationAlgorithm` direkt auf;
  keine Infrastruktur, Laufzeitmessung misst genau den Algorithmus. Nachteil: großer Lauf blockiert den Tab kurz.
- B) Wie A in einem Web Worker – UI bleibt bedienbar, aber mehr Code; erst bei tausenden Schülern nötig.
- C) API-Route auf dem Server – zweite Stelle, die in Prod gesperrt werden muss, Netzwerk verfälscht die Messung.

## Aufbau
- `app/dev/algorithmus/page.tsx` – Server-Komponente: in Prod `notFound()`, sonst rendert sie die Client-Komponente.
- `app/dev/algorithmus/AlgorithmPlayground.tsx` – `"use client"`, Formular, Gruppentabelle, Ergebnisanzeige.
- `group-registration/testData.ts` – reine Funktionen, mit Vitest getestet:
  - `createGroups(count, totalStudents)` → Gruppen mit Zufallsnamen, Kapazität Standard
    `ceil(Schüler / Gruppen)`, Beliebtheit Standard 5
  - `createRankings(studentCount, groups)` → pro Schüler eine **vollständige** Rangliste aller Gruppen,
    gewichtet nach Beliebtheit (gewichtetes Ziehen ohne Zurücklegen)
  - `toStudentChoices(rankings, k, randomCount)` → nimmt die ersten *k* (bzw. zufällig 1 … *k*) Plätze
    als Prioritäten 1, 2, …
- Beliebtheit: Regler/Zahl 1 … 10 als Gewicht; Gewicht 10 ist ≈ zehnmal so wahrscheinlich weit vorn wie 1.
- Der *k*-Vergleich nutzt dieselben Ranglisten und schneidet nur unterschiedlich ab, damit Unterschiede
  vom *k* kommen und nicht vom Zufall. Beim Schalter „zufällig 1 … *k*“ wird die zufällige Anzahl pro
  Schüler einmal gewürfelt und für jedes *k* auf höchstens *k* begrenzt (meine Entscheidung).
- Laufzeit mit `performance.now()` um den Aufruf.

## Dem Umsetzer überlassen
- Genaue Liste der Zufallsnamen, Layout der Tabellen, ob Zahlen als Eingabefeld oder Regler.
