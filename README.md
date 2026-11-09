# Schulprojekt Verwaltung

Next.js 14 (App Router) + TypeScript App zur Verwaltung von Projekttagen und Projekten,
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
| Super User / Lehrer | `/lehrer` | Benutzername + Passwort (erster Super User per Seed, siehe Setup) |
| Schüler | `/schueler` | Projekttag-Code + Anmeldename (`vorname.nachname`) + Passwort (10 Zeichen, per PDF verteilt) |

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

- Keine Sidebar — nur die Gruppen des Projekts, mit dem sich der Schüler angemeldet hat.
- Schüler vergeben Prioritäten (1 bis n) per Dropdown; jede Priorität kann nur einmal
  vergeben werden (automatische Umverteilung bei Konflikt).
- Speicherung erfolgt sofort serverseitig nach jeder Änderung.
- **Einschreibefrist wird serverseitig geprüft** — manipulierte Client-Zeit hat keinen Einfluss.
  Nach Ablauf der Frist gibt die API HTTP 403 zurück und das Frontend deaktiviert die Felder.

### Impressum & Datenschutz

Fixed Frosted-Glass-Footer unten rechts auf jeder Seite mit Links zu `/impressum` und
`/datenschutz`. Beide Seiten sind Platzhalter — eckige Klammern durch echte Schuldaten ersetzen.

---

## Datenmodell

| Tabelle | Zweck |
|---|---|
| `User` | Nur Lehrer und Super User (Benutzername + Passwort-Hash). |
| `Student` | Schüler mit Vor-/Nachname, Klasse, eindeutigem Anmeldenamen und Passwort (bcrypt-Hash + AES-256-GCM-verschlüsselt für die PDF). |
| `SchoolClass` | 16 Klassen (5a–12b), n:m mit Projekttagen verknüpft; Projekte können Klassen ausschließen. |
| `ProjectDay` | Projekttag mit Klassen, Zeitrahmen, Einschreibefrist und Code (aus dem Namen erzeugt, ändert sich beim Umbenennen nicht). |
| `Project` | Projekt innerhalb eines Projekttags (Plätze, optional Lehrer, ausgeschlossene Klassen). |
| `Preference` | Priorität (`rank`) eines Schülers für ein Projekt – Eingabe für den Einteilungsalgorithmus. |
| `Assignment` | Ergebnis der Einteilung: pro Projekttag und Schüler genau ein Projekt. |
| `Image` | Bannerbilder von Projekttagen/Projekten, ausgeliefert über `/api/images/<id>`. |

Schüler können sich nur an Projekttagen anmelden, denen ihre Klasse zugeordnet ist.

---

## Setup

Benötigt Node.js und PostgreSQL. Für lokale Tests liegt `docker-compose.dev.yml` bei
(Postgres auf Port 5433 – **nicht** für Produktion).

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. .env anlegen (Vorlage: example.env)
#    DATABASE_URL="postgresql://dev:dev@localhost:5433/schulprojekt"   (lokal)
#    STUDENT_PASSWORD_KEY mit `openssl rand -base64 32` erzeugen (Schüler-Passwörter)

# 3. Lokale Datenbank starten (optional)
docker compose -f docker-compose.dev.yml up -d

# 4. Migrationen anwenden
npx prisma migrate deploy

# 5. Seed: erster Super User + Schulklassen 5a–12b
#    (optional Demo-Projekttag mit 4 Schülern: SEED_DEMO=true, Zugangsdaten nur auf der Konsole)
#    Das Passwort wird NICHT fest vorgegeben, sondern per Umgebungsvariable (.env) gesetzt.
#    `npm run build` macht Schritt 4 und 5 automatisch; für `npm run dev` einmal manuell:
npx prisma db seed

# 6. Starten
npm run dev
```

Tests: `npm test`

---

## Datenbank ändern (Migrationen)

1. `prisma/schema.prisma` anpassen.
2. Gegen die **lokale** Datenbank eine Migration erzeugen:
   `npx prisma migrate dev --name <beschreibung>`
3. Den neuen Ordner unter `prisma/migrations/` **mit committen**. Ohne Migrationsdatei
   kommt die Änderung nie in der Produktions-Datenbank an.
4. Beim Deploy wendet `npm run build` die Migrationen mit `prisma migrate deploy` an und führt
   danach den Seed aus (`prisma db seed`). Der Seed ergänzt nur Fehlendes: Schulklassen und –
   falls noch nicht vorhanden – den Super User aus `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD`.
   Ein bestehender Super User wird nie überschrieben. Gibt es noch keinen und ist
   `SEED_ADMIN_PASSWORD` nicht gesetzt (mind. 8 Zeichen), bricht der Build mit einer Meldung ab.

Prüfen, ob Schema und Migrationen zusammenpassen (Ausgabe muss leer sein):

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

---

## Sicherheitshinweise

- **`NEXTAUTH_SECRET`** durch einen zufälligen langen String ersetzen: `openssl rand -base64 32`
- **`NEXTAUTH_URL`** auf die echte Adresse der App setzen.
- Lehrer-Passwörter haben mindestens 8 Zeichen.
- Schüler-Passwörter (10 Zeichen) werden als bcrypt-Hash und AES-256-GCM-verschlüsselt
  gespeichert (Schlüssel: `STUDENT_PASSWORD_KEY`). Klartext gibt es nur in der PDF und direkt
  nach „Neues Passwort erzeugen“.
- Beide Logins sind auf 10 Fehlversuche pro 15 Minuten begrenzt (im Speicher des
  Server-Prozesses – bei mehreren Instanzen nicht geteilt).
