# Schulprojekt Verwaltung

Next.js (App Router) + TypeScript App zur Verwaltung von Projekttagen und Projekten,
mit getrennten Logins für Lehrer und Schüler, Schulklassen-Zuordnung, Zeitrahmen,
Einschreibefrist mit serverseitiger Prüfung, Projekt-Prioritäten für Schüler,
Schülerverwaltung mit Excel-Import und PDF-Zugangsdaten sowie Impressum/Datenschutz.

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
- Jede Seite (Projekttage, Schüler, Einstellungen) hat eine **sticky Frosted-Glass Top Bar**
  mit Seitenname und dem Aktions-Button (`+ Projekttag anlegen` / `+ Projekt anlegen`)
  ganz rechts.
- Projekttag- und Projekt-Kacheln werden in einem **responsiven Grid** dargestellt
  (`auto-fill, minmax(300px, 1fr)`), das auf breiten Bildschirmen mehrere Spalten erzeugt.

### Login-Seiten

- **`/lehrer`** — blaues App-Icon (SVG), Frosted-Glass-Card, Fehler-Banner.
- **`/schueler`** — grünes App-Icon (SVG), gleiche Card-Struktur, grüner Login-Button.

### Einstellungen

- Zwei-Spalten-Layout: Formular links (max. 420 px), Liste rechts (füllt den Rest).
- Lehrer-Kacheln in eigenem `auto-fill`-Grid. Schüler werden unter **Schüler**
  (`/schueler-verwaltung`) verwaltet.

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
| **Super User** | Projekttage anlegen/ändern, alle Projekte sehen, Lehrer (Einstellungen) und Schüler (`/schueler-verwaltung`) verwalten |
| **Lehrer** | Projekttage sehen, eigene Projekte darin erstellen, bearbeiten, löschen |
| **Schüler** | Projekte seines Projekttags sehen (außer für seine Klasse ausgeschlossene) und Prioritäten vergeben (bis zur Frist) |

---

## Funktionen

### Projekttage & Projekte

- `/projekttage` listet die Projekttage; der Super User legt sie an (`/projekttage/new`) und bearbeitet sie.
- `/projekttage/<id>` zeigt die Projekte des Tags (Lehrer sehen nur ihre eigenen) mit „+ Projekt anlegen“.
- Ein Projekt kann einzelne Klassen des Projekttags ausschließen; der Super User kann es einem Lehrer zuordnen.
- Optional: Banner-Bild pro Projekttag und Projekt hochladbar.

### Schülerverwaltung (`/schueler-verwaltung`, nur Super User)

- Liste mit Klassenfilter, Bearbeiten, Löschen und „Neues Passwort“ (das Passwort wird einmal angezeigt).
- Einzelne Schüler anlegen; Anmeldename und Passwort erscheinen einmal.
- Excel-Import: `.xlsx` mit den Spalten `Vorname`, `Nachname`, `Klasse` (max. 5 MB / 2000 Zeilen,
  ganz oder gar nicht, vorhandene Schüler werden übersprungen). Danach „PDF der neuen Schüler“.
- PDF mit Zugangsdaten für alle Klassen oder eine Klasse (jede Klasse auf einer neuen Seite).

### Schulklassen

Eigene Tabelle `SchoolClass`. `npx prisma db seed` legt automatisch alle Klassen von
`5a`/`5b` bis `12a`/`12b` (16 Klassen) an. Jeder Projekttag muss mindestens einer
Schulklasse zugeordnet werden (Mehrfachauswahl per Checkboxen).

### Zeitrahmen

- **Start / Ende** eines Projekttags als reines Datum (Start = `00:00:00 UTC`, Ende = `23:59:59 UTC`).
- **Einschreibefrist** mit exakter Uhrzeit (`datetime-local`).
- Helfer-Funktionen in `lib/dateHelpers.ts`.

### Schüler-Ansicht (`/student`)

- Keine Sidebar — nur die Projekte des Projekttags, mit dessen Code sich der Schüler angemeldet
  hat (ohne Projekte, die seine Klasse ausschließen).
- Schüler vergeben Prioritäten (1 bis n) per Dropdown; jede Priorität kann nur einmal
  vergeben werden (automatische Umverteilung bei Konflikt).
- Speicherung erfolgt sofort serverseitig nach jeder Änderung.
- **Einschreibefrist wird serverseitig geprüft** — manipulierte Client-Zeit hat keinen Einfluss.
  Nach Ablauf der Frist gibt die API HTTP 403 zurück und das Frontend deaktiviert die Felder.
- Nach „Neues Passwort“ oder einem Klassenwechsel ist die alte Sitzung ungültig (HTTP 401);
  die Seite meldet den Schüler ab und leitet zum Login.

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

## Deployment-Hinweise

- **`STUDENT_PASSWORD_KEY`** setzen (32 Byte, base64: `openssl rand -base64 32`). Ohne ihn schlagen
  das Anlegen von Schülern, „Neues Passwort“ und der PDF-Export fehl. Den Schlüssel nicht wechseln,
  sonst lassen sich gespeicherte Passwörter nicht mehr für die PDF entschlüsseln.
- **Reverse Proxy**: Read-/Response-Timeout mindestens **180 s** für `POST /api/students/import`
  (2000 Schüler brauchen wegen bcrypt bis zu ca. 2 Minuten); Body-Limit mindestens 6 MB.
- **`X-Forwarded-For`** muss von einem vertrauenswürdigen Proxy gesetzt bzw. überschrieben werden:
  Die Begrenzung der Login-Fehlversuche verwendet die IP aus diesem Header. Kommt er ungeprüft
  vom Client, lässt sich die Begrenzung umgehen.
