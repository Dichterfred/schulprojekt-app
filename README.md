# Schulprojekt Verwaltung

Next.js 14 (App Router) + TypeScript App zur Verwaltung von Projekten und Gruppen,
mit getrennten Logins für Lehrer und Schüler, Schulklassen-Zuordnung, Zeitrahmen,
Einschreibefrist mit serverseitiger Prüfung, Gruppen-Prioritäten für Schüler sowie
Impressum/Datenschutz.

---

## UI & Design

Das Interface orientiert sich an den Apple Human Interface Guidelines:

- **Systemschrift** (`-apple-system`, SF Pro Text) für alle Texte
- **Apple-Systemfarben**: `#007AFF` (Blau), `#34C759` (Grün), `#FF3B30` (Rot)
- **Frosted-Glass-Effekte** (`backdrop-filter: blur`) auf Login-Cards, Top Bar und Footer
- **Abgerundete Kacheln** mit mehrschichtigen Schatten (`box-shadow`)
- **Kein überladenes UI** — kein Emoji-Einsatz, klare Hierarchie, viel Whitespace

### Layout (Lehrer-Bereich)

- Die **Sidebar** ist vollständig statisch (`height: 100vh`, kein Mitscrollen). Nur der
  Hauptinhalt rechts daneben scrollt.
- Jede Seite (Projekte, Gruppen, Einstellungen) hat eine **sticky Frosted-Glass Top Bar**
  mit Seitenname, Filteroptionen (Sortierung / Projektauswahl) und dem Aktions-Button
  (`+ Projekt erstellen` / `+ Gruppe erstellen`) ganz rechts.
- Projekt- und Gruppen-Kacheln werden in einem **responsiven Grid** dargestellt
  (`auto-fill, minmax(300px, 1fr)`), das auf breiten Bildschirmen mehrere Spalten erzeugt.

### Login-Seiten

- **`/lehrer`** — blaues App-Icon (SVG), Frosted-Glass-Card, Fehler-Banner.
- **`/schueler`** — grünes App-Icon (SVG), gleiche Card-Struktur, grüner Login-Button.

### Einstellungen

- Zwei-Spalten-Layout: Formular links (max. 420 px), Liste rechts (füllt den Rest).
- Lehrer- und Schüler-Kacheln in eigenem `auto-fill`-Grid.

---

## Anmeldung

| Rolle | URL | Zugangsdaten |
|---|---|---|
| Super User / Lehrer | `/lehrer` | Benutzername + Passwort (Super User: `admin` / `test1234`) |
| Schüler | `/schueler` | Projekt-Code + `Vorname.Nachname` |

---

## Rollen & Rechte

| Rolle | Kann … |
|---|---|
| **Super User** | Alle Projekte sehen, Lehrer & Schüler in Einstellungen verwalten |
| **Lehrer** | Eigene Projekte erstellen, bearbeiten, löschen |
| **Schüler** | Gruppen seines Projekts sehen und Prioritäten vergeben (bis zur Frist) |

---

## Funktionen

### Projekte & Gruppen

- Separate Seiten für Übersicht (`/projects`, `/groups`) und Erstellen (`/projects/new`, `/groups/new`).
- Inline-Bearbeitung per Stift-Button (✎) direkt in der Kachel.
- Projektliste sortierbar nach **Projektname** oder **Schulklasse**.
- Jede Projektkachel zeigt einen Fortschrittsbalken (zugeteilte Schüler / Gesamtanzahl).
- Optional: Banner-Bild pro Projekt und Gruppe hochladbar.

### Schulklassen

Eigene Tabelle `SchoolClass`. `npx prisma db seed` legt automatisch alle Klassen von
`5a`/`5b` bis `12a`/`12b` (16 Klassen) an. Jedes Projekt muss mindestens einer
Schulklasse zugeordnet werden (Mehrfachauswahl per Checkboxen).

### Zeitrahmen

- **Start / Ende** eines Projekts als reines Datum (Start = `00:00:00 UTC`, Ende = `23:59:59 UTC`).
- **Einschreibefrist** mit exakter Uhrzeit (`datetime-local`).
- Helfer-Funktionen in `lib/dateHelpers.ts`.

### Schüler-Ansicht (`/student`)

- Keine Sidebar — nur die Gruppen des zugewiesenen Projekts sind sichtbar.
- Schüler vergeben Prioritäten (1 bis n) per Dropdown; jede Priorität kann nur einmal
  vergeben werden (automatische Umverteilung bei Konflikt).
- Speicherung erfolgt sofort serverseitig nach jeder Änderung.
- **Einschreibefrist wird serverseitig geprüft** — manipulierte Client-Zeit hat keinen Einfluss.
  Nach Ablauf der Frist gibt die API HTTP 403 zurück und das Frontend deaktiviert die Felder.

### Impressum & Datenschutz

Fixed Frosted-Glass-Footer unten rechts auf jeder Seite mit Links zu `/impressum` und
`/datenschutz`. Beide Seiten sind Platzhalter — eckige Klammern durch echte Schuldaten ersetzen.

---

## Datenmodell (relevante Tabellen)

| Tabelle | Zweck |
|---|---|
| `User` | Lehrer, Super User, Schüler. Schüler über `enrolledProjectId` einem Projekt zugeordnet. |
| `Project` | Projekt mit Schulklassen, Zeitrahmen, Einschreibefrist, Code. |
| `Group` | Gruppe innerhalb eines Projekts, optional mit Bannerbild. |
| `SchoolClass` | 16 Klassen (5a–12b), über `SchoolClassesOnProjects` mit Projekten verknüpft. |
| `GroupPriority` | Priorität eines Schülers für eine Gruppe (`studentId`, `groupId`, `priority`). |

> **SQLite-Hinweis:** Prisma unterstützt bei SQLite keine `enum`-Typen. Die Rolle
> (`SUPERUSER`, `TEACHER`, `STUDENT`) wird daher als einfacher `String` gespeichert.

---

## Setup

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Datenbank erstellen
npx prisma migrate dev --name init

# 3. Seed ausführen (Super User admin/test1234 + Schulklassen 5a–12b)
npx prisma db seed

# 4. Entwicklungsserver starten
npm run dev
```

Dann `http://localhost:3000` im Browser öffnen.

---

## Sicherheitshinweise

- **`NEXTAUTH_SECRET`** in `.env` für produktiven Einsatz durch einen zufälligen langen
  String ersetzen:
  ```bash
  openssl rand -base64 32
  ```
- **Super-User-Passwort** (`test1234`) vor dem produktiven Einsatz in den Einstellungen ändern.

---

## Optional: PostgreSQL statt SQLite

In `prisma/schema.prisma` `provider` von `sqlite` auf `postgresql` ändern, ein echtes
`enum Role { SUPERUSER TEACHER STUDENT }` verwenden, `DATABASE_URL` in `.env` anpassen
und erneut `npx prisma migrate dev` ausführen.
