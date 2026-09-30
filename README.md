# Schulprojekt Verwaltung

Next.js 14 (App Router) + TypeScript App zur Verwaltung von Projekten und Gruppen,
mit getrennten Logins für Lehrer und Schüler, Schulklassen-Zuordnung, Zeitrahmen,
Einschreibefrist mit serverseitiger Prüfung, Gruppen-Prioritäten für Schüler sowie
Impressum/Datenschutz.

## Wichtiger Hinweis zur Datenbank

Diese App nutzt standardmäßig SQLite. SQLite unterstützt in Prisma keine `enum`-Typen,
deshalb wird die Rolle eines Nutzers (`SUPERUSER`, `TEACHER`, `STUDENT`) im Schema als
einfacher `String` gespeichert.

## Neu: Impressum & Datenschutz

- Unten rechts erscheint auf jeder Seite ein kleiner, fixierter Footer mit Links zu
  **`/impressum`** und **`/datenschutz`**. Beide Seiten sind Platzhalter-Seiten mit den
  üblichen Abschnitten (Anbieterkennzeichnung, verantwortliche Stelle, Zweck der
  Datenverarbeitung etc.) — die eckigen Klammern darin musst du noch durch die echten
  Angaben deiner Schule ersetzen, bevor die App produktiv genutzt wird.

## Neu: Schüler-Ansicht ohne Sidebar mit Gruppen-Prioritäten

- Meldet sich ein Schüler an, sieht er **keine Sidebar** (diese ist ausschließlich für
  Lehrer und den Super User) und landet direkt auf **`/student`**.
- Dort werden **nur die Gruppen des ihm zugewiesenen Projekts** angezeigt — keine
  anderen Projekte oder Gruppen sind sichtbar.
- Zu jeder Gruppe kann der Schüler über ein Dropdown eine **Priorität von 1 bis n**
  vergeben (n = Anzahl der Gruppen im Projekt). Jede Priorität kann nur einmal vergeben
  werden: Wählt der Schüler eine bereits vergebene Priorität für eine andere Gruppe,
  "wandert" diese Priorität automatisch zur neu ausgewählten Gruppe und wird bei der
  vorherigen Gruppe entfernt.
- Nach **jeder** Änderung wird die Auswahl sofort serverseitig gespeichert
  (Zwischenspeicherung), sodass beim versehentlichen Neuladen des Browsers keine
  Eingaben verloren gehen.
- **Einschreibefrist-Prüfung erfolgt serverseitig**: Die API vergleicht die aktuelle
  Serverzeit (`new Date()` auf dem Server) mit der im Projekt hinterlegten
  `enrollmentDeadline`. Eine manipulierte Systemzeit auf dem Endgerät des Schülers hat
  daher keinen Einfluss — nach Ablauf der Frist lehnt der Server jede weitere Änderung
  mit Fehler 403 ab, und auch das Frontend deaktiviert die Auswahlfelder entsprechend.

## Datenmodell für die Einschreibung (2 relevante Tabellen)

1. **`User`** (bereits vorhanden): Über `enrolledProjectId` ist jeder Schüler genau
   einem Projekt zugeordnet — das entspricht der "Schüler ↔ Projekt"-Zuordnung.
2. **`GroupPriority`** (neu): Enthält `studentId`, `projectId` und `groupId` sowie die
   vergebene `priority`. Zwei Unique-Constraints sichern die Regeln ab:
   - `@@unique([studentId, groupId])` — pro Schüler und Gruppe nur ein Eintrag.
   - `@@unique([studentId, priority])` — jede Priorität darf ein Schüler nur einmal
     vergeben.

## Neu: Start/Ende ohne Uhrzeit, Einschreibefrist mit Uhrzeit

- **Start** und **Ende** eines Projekts werden nur als Datum eingegeben. Der Start wird
  technisch auf `00:00:00.000Z` (Tagesanfang UTC) und das Ende auf `23:59:59.999Z`
  (Tagesende UTC) gesetzt.
- **Einschreibefrist** hat Datum **und** Uhrzeit, da hier der genaue Zeitpunkt zählt.
- Alle Zeitangaben werden als ISO-8601-UTC-`DateTime` in der Datenbank gespeichert
  (`lib/dateHelpers.ts` enthält die Umrechnungs-Helfer).

## Getrennte Seiten für Erstellen und Übersicht

- **`/projects`** zeigt nur die Liste aller Projekte (Sortierung, Bearbeiten-Stift).
  Das Erstellen erfolgt auf **`/projects/new`**.
- **`/groups`** zeigt nur die Gruppenliste eines ausgewählten Projekts. Das Erstellen
  erfolgt auf **`/groups/new`** (Projekt wird automatisch übernommen).

## Schulklassen

Eigene Tabelle `SchoolClass`. `npx prisma db seed` legt automatisch alle Klassen von
`5a`/`5b` bis `12a`/`12b` (16 Klassen) an. Jedes Projekt muss mindestens einer
Schulklasse zugeordnet werden (Mehrfachauswahl per Checkboxen).

## Sortierung der Projektliste

Über ein Dropdown können Lehrer und Super User die Projektliste alphabetisch nach
Projektname oder nach Schulklasse (natürliche Reihenfolge 5a → 12b) sortieren.

## Anmeldung

- **`/lehrer`** — für Lehrer und den Super User. Super User: `admin` / `test1234`.
- **`/schueler`** — für Schüler. Login mit **Projekt-Code** und **Vorname.Nachname**.

## Rollen & Rechte

- **Super User**: sieht alle Projekte, verwaltet unter "Einstellungen" Lehrer und Schüler.
- **Lehrer**: sieht nur seine eigenen Projekte, kann diese erstellen, bearbeiten, löschen.
- **Schüler**: sieht ausschließlich sein zugewiesenes Projekt mit dessen Gruppen und
  kann dort Prioritäten vergeben (bis zur Einschreibefrist).

## Bearbeiten von Projekten und Gruppen

Jede Projekt- und Gruppen-Kachel hat oben rechts ein Stift-Symbol (✎) zum Bearbeiten
direkt in der Kachel.

## Setup (Datenbank + Start)

1. Im Ordner `schulprojekt-app`:
   ```
   npm install
   ```
2. Datenbank erstellen (inkl. der neuen `GroupPriority`-Tabelle):
   ```
   npx prisma migrate dev --name init
   ```
3. Seed ausführen (Super User + Schulklassen 5a–12b), falls nicht automatisch passiert:
   ```
   npx prisma db seed
   ```
4. App starten:
   ```
   npm run dev
   ```
5. Im Browser `http://localhost:3000` öffnen.

## Wichtiger Hinweis zu NEXTAUTH_SECRET

In `.env` befindet sich `NEXTAUTH_SECRET`. Für den produktiven Einsatz bitte durch einen
eigenen, zufälligen langen String ersetzen, z. B. erzeugt mit:
```
openssl rand -base64 32
```

## Optional: PostgreSQL statt SQLite

Bei einem Wechsel auf PostgreSQL kannst du in `prisma/schema.prisma` wieder ein echtes
`enum Role { SUPERUSER TEACHER STUDENT }` verwenden. `provider` in `datasource db` von
`sqlite` auf `postgresql` ändern, `DATABASE_URL` in `.env` anpassen, erneut
`npx prisma migrate dev` ausführen.
