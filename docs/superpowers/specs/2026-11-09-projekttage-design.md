# Design: Projekttage, Schülerkonten & neuer Schüler-Login

Datum: 2026-11-09 · Branch: `feature/projekttage` (abgezweigt von `refactor/db-schema`)

## 1. Absicht & Warum

Die Schule organisiert keine einzelnen „Projekte mit Gruppen“, sondern **Projekttage**, an denen es mehrere
**Projekte** gibt. Die App soll diese Struktur abbilden:

- Der Super User plant den Projekttag (Datum, Frist, teilnehmende Klassen).
- Lehrer bieten darin ihre Projekte an.
- Alle Schüler der teilnehmenden Klassen wählen ohne manuelle Einschreibung.
- Schülerzugänge werden zentral verwaltet und als Zettel verteilt.
- Der Datenschutz bleibt gewahrt: zufällige Passwörter, keine Klarnamen in Codes.

## 2. Ziele

1. **Umbenennung und Umbau**: Das bisherige „Projekt“ heißt jetzt **Projekttag**, die bisherige „Gruppe“ heißt jetzt **Projekt**. Das gilt in UI, API, Code und Datenbank.
2. **Projekttag**:
   - Nur der Super User darf ihn anlegen, bearbeiten und löschen.
   - Die feste Schüleranzahl entfällt.
   - Alle Lehrer sehen alle Projekttage (lesend).
3. **Projekt**:
   - Lehrer und Super User legen Projekte innerhalb eines Projekttags an.
   - Pro Projekt können **Klassen ausgeschlossen** werden. Zur Auswahl stehen nur die Klassen des Projekttags.
   - Lehrer sehen und bearbeiten nur **eigene** Projekte, der Super User sieht und bearbeitet alle.
   - Der Super User kann ein Projekt beim Anlegen optional einem Lehrer zuordnen.
4. **Schülerkonten**, die unabhängig von Projekttagen bestehen:
   - Felder: Vorname, Nachname, Klasse, Anmeldename und Passwort.
   - Das Passwort wird vom System zufällig erzeugt, beim manuellen Anlegen und beim Excel-Import.
   - Schüler lassen sich bearbeiten und löschen, das Passwort lässt sich neu erzeugen.
   - Es gibt einen PDF-Export (Name, Klasse, Anmeldename, Passwort) für alle Klassen oder eine ausgewählte Klasse.
5. **Excel-Import** (`.xlsx`, nur Super User), der Schüler anlegt.
6. **Schüler-Login**:
   - Eingaben: Projekttag-Code, Anmeldename und Passwort.
   - Der Code bestimmt nur, welche Projekttag-Seite der Schüler sieht.
   - Ein Schüler sieht alle Projekte des Projekttags, außer denen, die seine Klasse ausschließen, und gibt dort Prioritäten ab wie bisher.

## 3. Nicht-Ziele

- Einteilungsalgorithmus und Zuteilung, also die Befüllung von `Assignment`. Das Modell bleibt bestehen und wird nur umgehängt. Dafür gibt es den separaten Branch `group-registration-algorithm`.
- Schuljahreswechsel und Versetzen ganzer Klassen.
- Selbst gewählte Passwörter für Schüler.
- Ein App-Container in Docker.
- Migration bestehender Daten. Es gibt nur Testdaten, und die dürfen weg.

## 4. Anti-Ziele (wäre ein Fehlschlag, auch wenn es „funktioniert“)

- Ein Lehrer sieht oder ändert fremde Projekte über die API, z. B. per geratener ID.
- Schülerpasswörter liegen im Klartext in der Datenbank oder erscheinen in Logs bzw. Listen-Responses.
- Ein Schüler sieht oder priorisiert ein Projekt, das seine Klasse ausschließt, oder meldet sich bei einem Projekttag an, an dem seine Klasse nicht teilnimmt.
- Der Import legt einen Teil der Schüler an und bricht dann ab.

## 5. Datenmodell (Prisma, neue Init-Migration)

Die bestehende Migration `20261109120000_init` wird durch eine neue Init-Migration ersetzt. Die Testdaten werden verworfen.

```prisma
enum Role { SUPERUSER  TEACHER }

model User {                     // Lehrer & Superuser (unverändert bis auf Relationen)
  id, username @unique, passwordHash, role, createdAt
  ownedProjects Project[]
}

model SchoolClass {
  id, name @unique, sortOrder @unique
  students         Student[]
  projectDays      ProjectDay[] @relation("ProjectDayClasses")
  excludedFrom     Project[]    @relation("ProjectExcludedClasses")
}

model Student {
  id, firstName, lastName, createdAt
  username          String @unique   // "anna-maria.von-berg", ggf. mit Ziffer (s. 6.1)
  passwordHash      String           // bcrypt – für den Login
  passwordEncrypted String           // AES-256-GCM – nur für PDF/Anzeige (s. 6.2)
  schoolClassId → SchoolClass (onDelete: Restrict)
  preferences Preference[]
  assignments Assignment[]
}

model ProjectDay {               // vormals Project
  id, name, description
  code @unique                   // aus Namen erzeugt, unveränderlich (lib/projectCode.ts bleibt)
  startDate, endDate, enrollmentDeadline, createdAt
  imageId? → Image ("ProjectDayImage")
  schoolClasses SchoolClass[] @relation("ProjectDayClasses")
  projects      Project[]
  preferences   Preference[]
  assignments   Assignment[]
  // KEIN studentCount, KEIN ownerId mehr
}

model Project {                  // vormals Group
  id, name, description, maxStudents, createdAt
  imageId? → Image ("ProjectImage")
  projectDayId → ProjectDay (onDelete: Cascade)
  ownerId? → User (onDelete: SetNull)
  excludedClasses SchoolClass[] @relation("ProjectExcludedClasses")
  preferences Preference[]
  assignments Assignment[]
}

model Preference {               // Enrollment entfällt; Priorität hängt direkt am Schüler
  id, rank, updatedAt
  studentId → Student (Cascade)
  projectDayId → ProjectDay (Cascade)
  projectId → Project (Cascade)
  @@unique([studentId, projectId])
  @@unique([studentId, projectDayId, rank])
}

model Assignment {               // nur umbenannt/umgehängt
  projectDayId, studentId, projectId
  @@unique([projectDayId, studentId])
}

model Image { … project ProjectDay? / Project? … }
```

`Enrollment` und die PIN-Logik werden gestrichen: das Model, `app/api/enrollments/**`, `app/api/projects/[id]/enrollments`, `lib/pin.ts` und die zugehörigen Tests.

## 6. Kernverhalten

### 6.1 Anmeldename

Der Anmeldename wird beim Anlegen aus Vor- und Nachnamen erzeugt und bei einer Namensänderung neu berechnet:

- Alles wird kleingeschrieben.
- Mehrere Vornamen bzw. Nachnamen werden mit `-` verbunden, Vor- und Nachname mit `.`. Beispiel: `Anna Maria` / `von Berg` → `anna-maria.von-berg`.
- *(Eigener Vorschlag)* Umlaute und ß werden umgeschrieben (`ä→ae, ö→oe, ü→ue, ß→ss`), Akzente entfernt. Alle Zeichen außer `a-z0-9-` fallen weg, mehrfache `-` werden zusammengezogen. Grund: Das lässt sich auf jeder Tastatur eintippen.
- *(Eigener Vorschlag)* Der Anmeldename ist **eindeutig**. Ist er schon vergeben, wird eine Ziffer angehängt (`max.mueller2`, `max.mueller3`, …). Grund: Auf dem Zettel steht dann immer ein eindeutiger Name.
- Beim Login wird die Eingabe getrimmt und kleingeschrieben.

### 6.2 Passwörter

- Das System erzeugt ein Passwort mit **10 Zeichen** aus einem Alphabet ohne verwechselbare Zeichen (`abcdefghjkmnpqrstuvwxyz23456789`). Dafür wird `crypto.randomInt` verwendet.
- Gespeichert wird es doppelt:
  - als bcrypt-Hash für den Login,
  - verschlüsselt mit **AES-256-GCM** (Node `crypto`) für den PDF-Export, im Format `iv:authTag:ciphertext` (base64).
- Der Schlüssel steht in der neuen Umgebungsvariable `STUDENT_PASSWORD_KEY` (32 Byte, base64). Fehlt er, schlagen das Anlegen von Schülern und der PDF-Export mit einer klaren Fehlermeldung fehl.
- Klartext-Passwörter erscheinen **nur** in der PDF und in der Antwort auf „Neues Passwort erzeugen“. Die Schülerliste der API liefert keine Passwörter.

### 6.3 Schüler-Login (`student-login` in `lib/auth.ts`)

1. Eingaben: `code`, `username`, `password`. Der Rate-Limiter bleibt bestehen und arbeitet mit dem Schlüssel `ip:code:username`.
2. Projekttag per `code` laden, Schüler per `username` laden und das Passwort per bcrypt prüfen.
3. Die Klasse des Schülers muss zu den Klassen des Projekttags gehören, sonst schlägt der Login fehl. Die Fehlermeldung ist generisch, damit sie keine Hinweise auf gültige Kombinationen gibt.
4. Die Session enthält `role: "STUDENT"`, `studentId` und `projectDayId`. `enrollmentId` entfällt.
5. Wenn die Anmeldefrist abgelaufen ist, ist der Login trotzdem möglich. Die Seite zeigt dann wie bisher „Frist abgelaufen“ und sperrt die Prioritäten.

### 6.4 Schüler-Ansicht und Prioritäten

- `GET /api/student/projects` (vormals `student/groups`) liefert den Projekttag und dessen Projekte **ohne** die Projekte, bei denen die Klasse des Schülers ausgeschlossen ist. Außerdem enthält die Antwort die Prioritäten des Schülers.
- `POST/DELETE /api/student/priorities`: Die Logik bleibt, auch das „Wandern“ der Priorität. Neu wird geprüft, ob das Projekt zum Projekttag der Session gehört, nicht für die Klasse ausgeschlossen ist und die Frist noch läuft.
- Die Obergrenze für den Rang ist die Anzahl der für den Schüler sichtbaren Projekte.

### 6.5 Zugriffsregeln (API)

| Aktion | Superuser | Lehrer |
|---|---|---|
| Projekttag lesen (Liste/Detail) | alle | alle |
| Projekttag anlegen/ändern/löschen | ja | nein (403) |
| Projekte eines Projekttags lesen | alle | nur eigene (`ownerId = self`) |
| Projekt anlegen | ja, optional Lehrer zuordnen | ja, Owner = self |
| Projekt ändern/löschen | alle | nur eigene, sonst 404 |
| Schüler verwalten, Import, PDF | ja | nein |

Für die Validierung von Projekten gilt:

- `excludedClassIds` muss eine Teilmenge der Klassen des Projekttags sein, sonst gibt es einen 400er.
- Wird eine Klasse aus dem Projekttag entfernt, wird sie bei allen Projekten dieses Tags auch aus den Ausschlüssen entfernt. Das passiert in derselben Transaktion.

Die Prüfung „Summe `maxStudents` ≤ `studentCount`“ entfällt.

### 6.5a Konsistenz bei Änderungen *(eigene Entscheidung)*

Prioritäten, die nicht mehr gültig sind, werden **in derselben Transaktion gelöscht**. Danach werden die übrigen Ränge des betroffenen Schülers in diesem Projekttag ohne Lücken neu durchnummeriert (1..n), die Reihenfolge bleibt dabei erhalten. Das gilt bei folgenden Änderungen:

- Ein Projekt schließt neu eine Klasse aus.
- Eine Klasse wird aus dem Projekttag entfernt.
- Ein Schüler wechselt per PATCH die Klasse.
- Ein Projekt wird gelöscht.

Diese Logik liegt als testbare Hilfsfunktion in `lib/`.

### 6.5b Sessions der Schüler *(eigene Entscheidung)*

- `Student` bekommt das Feld `sessionVersion Int @default(0)`. Es wird hochgezählt, wenn ein neues Passwort erzeugt wird oder der Schüler die Klasse wechselt.
- Der Wert steht im JWT. Jede Schüler-API prüft deshalb vor der Antwort:
  - ob der Schüler noch existiert,
  - ob `sessionVersion` übereinstimmt,
  - ob die Klasse noch zum Projekttag gehört.
- Schlägt eine Prüfung fehl, antwortet die API mit 401 und die UI leitet zum Login.

### 6.6 Excel-Import

- Endpoint: `POST /api/students/import` (multipart, nur Super User). Die Datei wird mit `exceljs` gelesen.
- Format: Das erste Tabellenblatt hat eine Kopfzeile mit `Vorname`, `Nachname`, `Klasse`. Die Groß-/Kleinschreibung ist egal, die Spaltenreihenfolge auch.
- Validierung:
  - Pflichtfelder müssen gefüllt sein.
  - Namen dürfen keinen Punkt enthalten.
  - Die Klasse muss existieren, sie wird nach `SchoolClass.name` gesucht, ohne Rücksicht auf Groß-/Kleinschreibung.
- **Ganz oder gar nicht:**
  - Bei Fehlern wird nichts angelegt. Die Antwort ist eine Fehlerliste mit Zeilennummer und Grund.
  - Ohne Fehler werden alle Schüler in einer Transaktion angelegt.
- Duplikate werden übersprungen und in der Antwort gemeldet. Ein Duplikat ist ein Schüler mit demselben Vor- und Nachnamen (ohne Rücksicht auf Groß-/Kleinschreibung) in derselben Klasse, entweder schon in der Datenbank oder weiter oben in der Datei.
- Grenzen: höchstens 5 MB und 2000 Zeilen.
- Die Antwort enthält die Anzahl angelegter und übersprungener Schüler sowie die IDs der neuen Schüler. Die UI bietet danach direkt „PDF der neuen Schüler“ an.

### 6.7 PDF-Export

- Endpoint: `POST /api/students/pdf`, nur für den Super User. Der Body ist eines von:
  - `{ classId }`,
  - `{}` für alle Klassen,
  - `{ studentIds: [...] }` für frisch importierte Schüler. *(Eigene Entscheidung:* POST statt GET, weil 2000 IDs nicht in eine URL passen.)
- Erzeugt wird die PDF mit `pdf-lib` und `@pdf-lib/fontkit` und einer **eingebetteten Unicode-Schrift**, z. B. Noto Sans (OFL-Lizenz). Die Datei liegt im Repo unter `assets/fonts/`. *(Eigene Entscheidung:* Helvetica kann Zeichen wie ł, ş oder ć nicht darstellen. Solche Namen sollen trotzdem gedruckt werden können.)- Aufbau:
  - pro Klasse ein Abschnitt, jede Klasse beginnt auf einer neuen Seite,
  - Tabelle mit Nachname, Vorname, **Anmeldename** und **Passwort**, nach Nachname sortiert,
  - Zeilen mit Trennlinien zum Ausschneiden, damit sich Zettel verteilen lassen.
- Der Projekttag-Code steht nicht auf der PDF, weil er vom Schülerkonto unabhängig ist.
- Response-Header: `Content-Disposition: attachment; filename="zugangsdaten-<klasse|alle>.pdf"` und `Cache-Control: no-store`.

### 6.8 Schülerverwaltung

- Endpoints:
  - `GET/POST /api/students`,
  - `PATCH/DELETE /api/students/[id]`,
  - `POST /api/students/[id]/password` erzeugt ein neues Passwort und gibt es einmal im Klartext zurück.
- Bei `PATCH` lassen sich Vorname, Nachname und Klasse ändern. Der Anmeldename wird dabei neu berechnet.
- `DELETE` löscht auch die Prioritäten und Zuteilungen des Schülers (Cascade).

## 7. Frontend

### 7.1 Navigation (Sidebar)

- **Projekttage** (`/projekttage`) für alle Lehrer und den Super User.
- **Schüler** (`/schueler-verwaltung`) nur für den Super User. Hier liegen die Liste, das Anlegen, der Import und der PDF-Export.
- **Einstellungen** bleiben, mit der Lehrerverwaltung.
- Der Reiter „Gruppen“ entfällt. Die Projekte erscheinen im Projekttag.
- Die Unterliste der Projekte in der Sidebar (heute `/groups?projectId=`) zeigt künftig die Projekttage.

### 7.2 Seiten

- `/projekttage`: Liste der Projekttage als Karten mit Name, Datum, Frist, Klassen und Code. Der Super User sieht dazu „+ Projekttag anlegen“.
- `/projekttage/new` und `/projekttage/[id]/edit`: Formular für den Super User, basierend auf `projects/new` ohne Schüleranzahl.
- `/projekttage/[id]`:
  - oben die Infos zum Projekttag,
  - darunter die Projekte, gefiltert nach Rolle,
  - der Button „+ Projekt anlegen“,
  - Projekt-Karten, die Lehrer und „ohne Klassen: …“ zeigen.
- `/projekttage/[id]/projekte/new` und `…/[projectId]/edit`: Formular für ein Projekt, basierend auf `groups/new`. Neu ist die Mehrfachauswahl „Klassen ausschließen“ mit den Klassen des Tags. Der Super User hat zusätzlich das Feld „Lehrer zuordnen“.
- `/schueler-verwaltung`:
  - Filter nach Klasse,
  - Tabelle mit Name, Klasse und Anmeldename, dazu Bearbeiten, Löschen (mit Rückfrage) und „Neues Passwort“ (zeigt das Passwort einmal an),
  - Formular „Schüler anlegen“,
  - Upload für den Excel-Import mit Ergebnis- bzw. Fehlerliste,
  - „PDF erzeugen“ mit Klassenauswahl oder für alle Klassen.
- `/schueler` (Login): Die Felder heißen jetzt Projekttag-Code, Anmeldename (`vorname.nachname`) und Passwort.
- `/student`: Texte ändern sich von „Projekt/Gruppen“ zu „Projekttag/Projekte“.
- Die alten Routen `/projects` und `/groups` werden entfernt.

## 8. Infrastruktur

- `docker-compose.dev.yml` *(Vorschlag, vom Nutzer bestätigt)*:
  - Der Volume-Name wird auf `schulprojekt-dev-db-v2` geändert, damit die neue Init-Migration auf eine leere Datenbank trifft.
  - Ein Kommentar erklärt das Zurücksetzen mit `docker compose -f docker-compose.dev.yml down -v`.
  - Die Datei startet weiterhin nur die Datenbank.
- `example.env`: Hinzu kommt `STUDENT_PASSWORD_KEY` mit dem Hinweis `openssl rand -base64 32`.
- `seed.ts`: Klassen und Super User bleiben gleich. *(Eigener Vorschlag)* Hinzu kommen optionale Demo-Daten (ein Projekttag, ein paar Schüler), nur wenn `SEED_DEMO=true` gesetzt ist.
- Neue Abhängigkeiten: `exceljs`, `pdf-lib` und `@pdf-lib/fontkit`, außerdem eine Schriftdatei (Noto Sans).

## 9. Ansätze (betrachtet & entschieden)

| Thema | Optionen | Entscheidung |
|---|---|---|
| Passwort-Speicherung | A: verschlüsselt + Hash · B: nur Hash, PDF nur direkt nach Erzeugung | **A** (Nutzer). PDF jederzeit nachdruckbar, Risiko vertretbar bei reinen Zufallspasswörtern |
| PDF | A: Server mit `pdf-lib` · B: Browser-Druckansicht | **A** (Nutzer). Einheitliches Layout, ein Klick |
| Excel | A: `exceljs` · B: `xlsx`/SheetJS von npm | **A** (Nutzer). Die npm-Version von SheetJS ist veraltet und hat bekannte Sicherheitslücken |
| Login | nur Code + Passwort · Code + Name + Passwort | **Code + Anmeldename + Passwort** (Nutzer). Nur mit Passwort wäre Raten zu leicht |
| Datenmigration | Bestand umbauen · neu aufsetzen | **Neu aufsetzen** (Nutzer). Es gibt nur Testdaten |
| Benennung im Code | alte Namen behalten · umbenennen | **Umbenennen** auf `ProjectDay`/`Project` (Vorschlag, genehmigt) |

## 10. Tests (Vitest, wie bestehend)

Unit-Tests:

- Erzeugung des Anmeldenamens: Mehrfachnamen, Umlaute, Akzente, Sonderzeichen, Ziffer bei Kollision.
- Passwortgenerator: Länge, Alphabet.
- Ver- und Entschlüsselung: Roundtrip, manipulierter Ciphertext schlägt fehl, fehlender Schlüssel.
- Parser für den Excel-Import, der auf einem Buffer arbeitet: Kopfzeile, fehlende Spalten, leere Zeilen, unbekannte Klasse, Duplikate in der Datei.
- PDF-Erzeugung: ergibt eine gültige PDF, die die Anmeldenamen enthält.
- Zod-Schemas für Projekttag und Projekt (`excludedClassIds`).
- Zugriffslogik als reine Funktionen: Filter nach Rolle, Teilmenge der ausgeschlossenen Klassen, sichtbare Projekte für eine Klasse.

Bestehende Tests für `pin` und den Enrollment-Bezug werden entfernt bzw. angepasst. `projectCode`, `rateLimit` und `validation` werden angepasst.

## 11. Dem Umsetzer überlassen

- Konkrete Komponentenstruktur und Styling, im bestehenden Stil von `styles/*.css`.
- Ob Formulare für Anlegen und Bearbeiten eine gemeinsame Komponente nutzen.
- Reihenfolge der Umsetzungsschritte im Plan.
- Exaktes PDF-Layout im Rahmen von 6.7.
