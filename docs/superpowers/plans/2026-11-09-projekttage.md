# Projekttage, Schülerkonten & neuer Schüler-Login – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus „Projekt/Gruppe“ wird „Projekttag/Projekt“. Schüler werden zentral als Konten mit zufälligem Passwort verwaltet (anlegen, Excel-Import, PDF) und melden sich mit Projekttag-Code + Anmeldename + Passwort an.

**Architecture:**
- Die Fachlogik liegt als reine, unit-getestete Funktionen in `lib/`: Anmeldename, Passwort/Krypto, Import-Parser, PDF, Ränge, Zugriff.
- Die API-Routen (Next.js App Router) sind dünne Schichten aus Prisma-Abfragen und diesen Funktionen.
- Das Prisma-Schema wird neu aufgesetzt, mit neuer Init-Migration.

**Tech Stack:** Next.js 16, React 18, Prisma 5 / PostgreSQL 16, NextAuth 4 (JWT), Zod 4, Vitest 4. Neu: `exceljs`, `pdf-lib`, `@pdf-lib/fontkit`.

**Spec:** `docs/superpowers/specs/2026-11-09-projekttage-design.md`. Lies sie vor jedem Task, die Abschnittsnummern unten verweisen darauf.

## Global Constraints

- Branch: `feature/projekttage`. Commits mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- UI-Texte und Fehlermeldungen sind auf Deutsch, Code-Kommentare ebenfalls, wie im Bestand.
- Benennung: Prisma-Model `ProjectDay` (UI „Projekttag“), Prisma-Model `Project` (UI „Projekt“, vormals Group).
- Anmeldename:
  - kleingeschrieben, Mehrfachnamen mit `-`, Vor- und Nachname getrennt durch `.`,
  - `ä→ae, ö→oe, ü→ue, ß→ss`, Akzente entfernt, nur `a-z0-9-`, mehrfache `-` zusammengezogen, kein `-` am Rand,
  - eindeutig: bei Kollision werden `2`, `3`, … angehängt (`max.mueller2`).
- Schülerpasswort: 10 Zeichen aus `abcdefghjkmnpqrstuvwxyz23456789`, erzeugt mit `crypto.randomInt`.
- Speicherung: bcrypt-Hash (cost 10) und AES-256-GCM-Text im Format `iv:authTag:ciphertext` (je base64). Der Schlüssel kommt aus `STUDENT_PASSWORD_KEY` (32 Byte, base64).
- Klartextpasswörter erscheinen nur in diesen Antworten:
  - `POST /api/students` (Anlegen),
  - `POST /api/students/[id]/password`,
  - der PDF.
  - Niemals in Listen, Logs oder `console.*`.
- Import: nur `.xlsx`, höchstens 5 MB und 2000 Datenzeilen. Kopfzeile `Vorname`, `Nachname`, `Klasse`, ohne Rücksicht auf Groß-/Kleinschreibung und Reihenfolge. Es gilt: ganz oder gar nicht.
- PDF:
  - eingebettete Schrift `assets/fonts/NotoSans-Regular.ttf` (OFL, `assets/fonts/OFL.txt` mit einchecken),
  - Header `Cache-Control: no-store` und `Content-Disposition: attachment; filename="zugangsdaten-<klasse|alle>.pdf"`.
- Jeder Task endet mit grünem `npm test`. Ab Task 8 gilt zusätzlich `npx tsc --noEmit` ohne Fehler.

## Review Focus

1. **Login-Eingabe mit Leerzeichen/Großschreibung** (`"  Max.Mueller "`): Der Login muss klappen. Test in Task 1 (`normalizeLoginName`).
2. **Gleicher Name zweimal im selben Import** (Max Müller in 5a und 6b): Es entstehen `max.mueller` und `max.mueller2`, kein Unique-Fehler. Test in Task 1 (`assignUsernames` mit Batch).
3. **Excel-Zellen, die keine reinen Strings sind:** Zahlen, Rich Text, Formeln oder Klasse `"5A"` statt `"5a"`, dazu leere Zeilen am Ende. Alles wird korrekt gelesen oder übersprungen. Tests in Task 3.
4. **Neu-Nummerieren der Ränge** trifft auf die Unique-Constraint `(studentId, projectDayId, rank)`. Ein Update in zwei Phasen darf nicht scheitern. Test in Task 5 (`compactRanks`) und Umsetzung in Task 7 (`pruneInvalidPreferences`).
5. **Lehrer ruft fremdes Projekt per ID ab bzw. ändert einen Projekttag:** Antwort ist 404 bzw. 403. Test in Task 5 (`projectAccessFilter`, `canManageProjectDays`).

---

### Task 1: Anmeldename (`lib/username.ts`)

**Files:**
- Create: `lib/username.ts`
- Test: `tests/username.test.ts`

**Interfaces:**
- Produces:
  - `buildUsernameBase(firstName: string, lastName: string): string`. Gibt `""` zurück, wenn ein Teil nach dem Normalisieren leer ist.
  - `withNumberSuffix(base: string, taken: ReadonlySet<string>): string`. Ergibt `base`, sonst `base2`, `base3`, …
  - `assignUsernames<T extends { firstName: string; lastName: string }>(people: T[], taken: Set<string>): (T & { username: string })[]`. Trägt jeden vergebenen Namen in `taken` ein, sodass auch Kollisionen innerhalb des Batches aufgelöst werden.
  - `normalizeLoginName(input: string): string`. Trimmt und schreibt alles klein.

- [ ] **Step 1: Write the failing tests** in `tests/username.test.ts`:
  - `buildUsernameBase("Anna Maria", "von Berg")` → `"anna-maria.von-berg"`
  - `buildUsernameBase("Jürgen", "Weiß")` → `"juergen.weiss"`
  - `buildUsernameBase("Zoë", "Ćorić")` → `"zoe.coric"`
  - `buildUsernameBase("  Max  ", "Müller-Lüdenscheidt")` → `"max.mueller-luedenscheidt"`
  - `buildUsernameBase("Ann--Kathrin", "O'Neil")` → `"ann-kathrin.oneil"`
  - `buildUsernameBase("???", "Test")` → `""`
  - `withNumberSuffix("max.mueller", new Set())` → `"max.mueller"`
  - `withNumberSuffix("max.mueller", new Set(["max.mueller","max.mueller2"]))` → `"max.mueller3"`
  - `assignUsernames([{firstName:"Max",lastName:"Müller"},{firstName:"Max",lastName:"Müller"}], new Set(["max.mueller"]))`: Die Namen sind `["max.mueller2","max.mueller3"]`.
  - `normalizeLoginName("  Max.Mueller ")` → `"max.mueller"`
- [ ] **Step 2:** `npx vitest run tests/username.test.ts` → FAIL (Modul fehlt)
- [ ] **Step 3: Implement.** Umlaute vor `normalize("NFKD")` ersetzen, wie in `lib/projectCode.ts`, aber kleingeschrieben. Leerzeichen und `-`-Folgen werden zu einem `-`. Andere Zeichen fallen ersatzlos weg, z. B. das Apostroph.
- [ ] **Step 4:** `npx vitest run tests/username.test.ts` → PASS
- [ ] **Step 5: Commit** `feat: Anmeldenamen für Schüler erzeugen`

### Task 2: Schülerpasswort & Verschlüsselung (`lib/studentPassword.ts`)

**Files:**
- Create: `lib/studentPassword.ts`
- Modify: `example.env` (neu: `STUDENT_PASSWORD_KEY="mit 'openssl rand -base64 32' erzeugen"`)
- Test: `tests/studentPassword.test.ts`

**Interfaces:**
- Produces:
  - `STUDENT_PASSWORD_LENGTH = 10` und `STUDENT_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"`
  - `generateStudentPassword(): string`
  - `loadPasswordKey(env?: NodeJS.ProcessEnv): Buffer`. Wirft `Error("STUDENT_PASSWORD_KEY fehlt oder ist kein 32-Byte-Schlüssel (base64).")`.
  - `encryptPassword(plain: string, key?: Buffer): string` und `decryptPassword(encrypted: string, key?: Buffer): string`. Ohne `key` wird `loadPasswordKey()` verwendet.
  - `createStudentCredentials(key?: Buffer): Promise<{ password: string; passwordHash: string; passwordEncrypted: string }>`
  - `verifyStudentPassword(plain: string, hash: string): Promise<boolean>`

- [ ] **Step 1: Write the failing tests:**
  - 200 generierte Passwörter haben die Länge 10, bestehen nur aus Zeichen des Alphabets und sind nicht alle gleich.
  - Roundtrip mit `randomBytes(32)`: `decryptPassword(encryptPassword("abc", k), k) === "abc"`.
  - Zweimal verschlüsseln ergibt verschiedene Texte (zufälliger IV).
  - Ein manipulierter Ciphertext (ein Zeichen geändert) lässt `decryptPassword` werfen.
  - Ein falscher Schlüssel lässt `decryptPassword` werfen.
  - `loadPasswordKey({})` wirft, `loadPasswordKey({ STUDENT_PASSWORD_KEY: Buffer.alloc(16).toString("base64") })` wirft.
  - `createStudentCredentials(k)`: Der Hash verifiziert das Passwort, `decryptPassword(passwordEncrypted, k) === password`.
- [ ] **Step 2:** Run `npx vitest run tests/studentPassword.test.ts` → FAIL
- [ ] **Step 3: Implement** mit `crypto.createCipheriv("aes-256-gcm", key, iv)`, IV 12 Byte, `bcryptjs` cost 10.
- [ ] **Step 4:** Run `npx vitest run tests/studentPassword.test.ts` → PASS
- [ ] **Step 5: Commit** `feat: zufällige Schülerpasswörter mit AES-GCM-Speicherung`

### Task 3: Excel-Import-Parser (`lib/studentImport.ts`)

**Files:**
- Create: `lib/studentImport.ts`
- Modify: `package.json` (`npm install exceljs`)
- Test: `tests/studentImport.test.ts`. Die Test-Workbooks werden im Test mit `exceljs` im Speicher gebaut.

**Interfaces:**
- Produces:
  - `MAX_IMPORT_ROWS = 2000` und `MAX_IMPORT_BYTES = 5 * 1024 * 1024`
  - `type ImportRow = { row: number; firstName: string; lastName: string; className: string }` (`row` ist die Excel-Zeilennummer)
  - `type ImportIssue = { row: number; message: string }`
  - `parseStudentWorkbook(data: ArrayBuffer): Promise<{ rows: ImportRow[]; errors: ImportIssue[] }>`
  - `planImport(rows: ImportRow[], classes: { id: string; name: string }[], existing: { firstName: string; lastName: string; schoolClassId: string }[]): { toCreate: { row: number; firstName: string; lastName: string; schoolClassId: string }[]; skipped: ImportIssue[]; errors: ImportIssue[] }`

- [ ] **Step 1: Write the failing tests:**
  - Die Kopfzeile wird in beliebiger Reihenfolge und Schreibweise erkannt (`"KLASSE","vorname","Nachname"`).
  - Fehlt eine Spalte, kommt `errors[0].message` mit `"Spalte"` und dem Spaltennamen, `rows` ist leer.
  - Komplett leere Zeilen werden ignoriert, auch am Ende.
  - Eine Zelle mit Zahl `5` und eine mit Rich Text werden als String gelesen. Bei Formeln wird `result` verwendet.
  - Fehlt Vorname oder Nachname, oder enthält einer einen `.`, gibt es einen Fehler mit der Zeilennummer.
  - Mehr als 2000 Datenzeilen ergeben einen Fehler mit `"2000"`.
  - Eine Datei, die kein xlsx ist (z. B. `new TextEncoder().encode("x")`), ergibt einen Fehler und keine Exception.
  - `planImport`:
    - Die Klasse `"5A"` wird der Klasse `5a` zugeordnet.
    - Eine unbekannte Klasse ergibt `errors` mit `"Klasse"`.
    - Ein Duplikat in der Datenbank (ohne Rücksicht auf Groß-/Kleinschreibung) landet in `skipped`.
    - Ein Duplikat innerhalb der Datei landet mit der zweiten Zeile in `skipped`.
    - Gleicher Name in verschiedenen Klassen ergibt beide in `toCreate`.
- [ ] **Step 2:** Run `npx vitest run tests/studentImport.test.ts` → FAIL
- [ ] **Step 3: Implement.** Nur das erste Tabellenblatt lesen. Zellen mit `cell.text` bzw. `cell.result` in einen getrimmten String wandeln.
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Commit** `feat: Excel-Import für Schüler parsen und prüfen`

### Task 4: PDF mit Zugangsdaten (`lib/studentsPdf.ts`)

**Files:**
- Create: `lib/studentsPdf.ts`, `assets/fonts/NotoSans-Regular.ttf` und `assets/fonts/OFL.txt` (aus dem offiziellen Noto-Repo, `github.com/notofonts/latin-greek-cyrillic`, Release-TTF)
- Modify: `package.json` (`npm install pdf-lib @pdf-lib/fontkit`)
- Test: `tests/studentsPdf.test.ts`

**Interfaces:**
- Produces:
  - `type CredentialRow = { firstName: string; lastName: string; username: string; password: string }`
  - `renderCredentialsPdf(classes: { className: string; students: CredentialRow[] }[]): Promise<Uint8Array>`. Die Schrift wird per `fs.readFile(path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"))` geladen.

- [ ] **Step 1: Write the failing tests:**
  - Das Ergebnis beginnt mit `%PDF-`.
  - `PDFDocument.load(bytes)` liefert für zwei Klassen mit je 3 Schülern mindestens 2 Seiten.
  - Für eine Klasse mit 60 Schülern entstehen mehr als 1 Seite (Seitenumbruch).
  - Namen wie `"Łukasz"`, `"Şahin"` und `"Ćorić"` werfen nicht.
  - Eine leere Liste ergibt eine einseitige PDF mit dem Hinweis „Keine Schüler“.
- [ ] **Step 2:** Run `npx vitest run tests/studentsPdf.test.ts` → FAIL
- [ ] **Step 3: Implement.** Format A4. Jede Klasse beginnt auf einer neuen Seite mit der Überschrift `Klasse <name>`.
  - Spalten: Nachname, Vorname, Anmeldename, Passwort.
  - Das Passwort wird in größerer Schrift gesetzt.
  - Zwischen den Zeilen steht eine gestrichelte Trennlinie zum Ausschneiden.
  - Die Fußzeile enthält `Seite x / y`.
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Commit** `feat: PDF mit Schüler-Zugangsdaten erzeugen`

### Task 5: Reine Zugriffs- und Rangfunktionen (`lib/access.ts`, `lib/ranks.ts`)

**Files:**
- Create: `lib/access.ts`, `lib/ranks.ts`
- Test: `tests/access.test.ts`, `tests/ranks.test.ts`

**Interfaces:**
- Produces (`lib/access.ts`, ohne Prisma-Import außer `import type`):
  - `type SessionUser = { id: string; role: "SUPERUSER" | "TEACHER" | "STUDENT" }`
  - `canManageProjectDays(user: SessionUser): boolean`. Gibt nur für SUPERUSER `true` zurück.
  - `projectAccessFilter(user: SessionUser): Prisma.ProjectWhereInput`. Für SUPERUSER `{}`, für alle anderen `{ ownerId: user.id }`.
  - `studentVisibleProjectsWhere(projectDayId: string, schoolClassId: string): Prisma.ProjectWhereInput`. Ergibt `{ projectDayId, excludedClasses: { none: { id: schoolClassId } } }`.
  - `invalidExcludedClassIds(excludedIds: string[], dayClassIds: string[]): string[]`
  - `isStudentSessionValid(student: { sessionVersion: number; schoolClassId: string } | null, tokenVersion: number, dayClassIds: string[]): boolean`
- Produces (`lib/ranks.ts`):
  - `compactRanks<T extends { id: string; rank: number }>(prefs: T[]): { id: string; from: number; to: number }[]`. Sortiert nach Rang, vergibt 1..n und gibt nur die geänderten zurück.

- [ ] **Step 1: Write the failing tests:**
  - `canManageProjectDays({id:"t",role:"TEACHER"}) === false`
  - `projectAccessFilter` liefert für TEACHER `{ownerId:"t"}` und für SUPERUSER `{}`.
  - `invalidExcludedClassIds(["a","x"],["a","b"])` → `["x"]`
  - `isStudentSessionValid`:
    - `null` → false,
    - Version weicht ab → false,
    - Klasse nicht im Tag → false,
    - sonst true.
  - `compactRanks([{id:"a",rank:3},{id:"b",rank:1},{id:"c",rank:5}])` → `[{id:"a",from:3,to:2},{id:"c",from:5,to:3}]`
  - `compactRanks([])` → `[]`
- [ ] **Step 2:** Run `npx vitest run tests/access.test.ts tests/ranks.test.ts` → FAIL
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Commit** `feat: Zugriffsregeln und Rang-Verdichtung als reine Funktionen`

### Task 6: Schema, Migration, Infrastruktur, Validierung

**Files:**
- Modify: `prisma/schema.prisma`. Neues Schema gemäß Spec §5, dazu in `Student`:
  - `username String @unique`
  - `passwordHash String`
  - `passwordEncrypted String`
  - `sessionVersion Int @default(0)`
- Delete: `prisma/migrations/20261109120000_init/`
- Create: `prisma/migrations/20261109180000_init/migration.sql`
- Modify: `docker-compose.dev.yml`
  - Volume `schulprojekt-dev-db` wird zu `schulprojekt-dev-db-v2`, an beiden Stellen.
  - Kommentar zum Zurücksetzen mit `docker compose -f docker-compose.dev.yml down -v`.
- Modify: `lib/validation.ts`, `tests/validation.test.ts`
- Modify: `prisma/seed.ts`
- Modify: `README.md`, falls dort Setup-Schritte, „Gruppen“ oder „PIN“ stehen.

**Interfaces:**
- Produces (`lib/validation.ts`):
  - `projectDaySchema`: wie bisher `projectSchema`, aber **ohne** `studentCount` und `assignedOwnerId`.
  - `projectSchema`: wie bisher `groupSchema`, plus `excludedClassIds: z.array(z.string().min(1)).default([])` und `assignedOwnerId: z.string().min(1).nullable().optional()`.
  - `projectCreateSchema = projectSchema.extend({ projectDayId })`
  - `studentCreateSchema`: bleibt.
  - `studentUpdateSchema = studentCreateSchema.partial()`
  - `priorityRankSchema = { projectId, priority }`
  - `studentsPdfRequestSchema`: Union aus `{ classId: string }`, `{ studentIds: string[] (1..2000) }` und `{}`.
  - **Entfernt:** `parseStudentLogin`, `enrollmentCreateSchema`, `groupSchema`, `groupCreateSchema`.

- [ ] **Step 1: Update `tests/validation.test.ts`.**
  - Die Tests für `projectSchema` werden zu `projectDaySchema`, `studentCount` fällt weg.
  - `groupSchema` wird zu `projectSchema`: `excludedClassIds` fehlt → `[]`.
  - `studentsPdfRequestSchema` akzeptiert `{}`, `{classId:"c"}` und `{studentIds:["s"]}`, lehnt aber `{studentIds:[]}` ab.
  - Der Block zu `parseStudentLogin` wird entfernt.
- [ ] **Step 2:** Run `npx vitest run tests/validation.test.ts` → FAIL
- [ ] **Step 3: Implement** in `lib/validation.ts`.
- [ ] **Step 4: Schema schreiben und Migration erzeugen, ohne Datenbank:**
  `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261109180000_init/migration.sql`
  Danach `npx prisma generate`. Erwartung: kein Fehler.
- [ ] **Step 5: Seed anpassen.**
  - Klassen und Super User bleiben.
  - Ist `SEED_DEMO=true` gesetzt, legt der Seed einen Projekttag `Demo-Projekttag` an, der die Klassen 5a und 5b enthält und über `upsert` per Code eingetragen wird.
  - Dazu kommen 4 Schüler über `assignUsernames` und `createStudentCredentials`. Der Seed gibt deren Anmeldename und Passwort **nur** auf der Konsole aus.
- [ ] **Step 6: DB neu aufsetzen und prüfen.**
  - `docker compose -f docker-compose.dev.yml down -v`
  - `docker compose -f docker-compose.dev.yml up -d`
  - `npx prisma migrate deploy` und `npx prisma db seed`
  - Erwartung: Migration angewandt, „Superuser … erstellt“.
- [ ] **Step 7:** Run `npm test` → `validation`, `projectCode`, `rateLimit` und die Tests aus Tasks 1–5 PASS. `npx tsc --noEmit` darf hier noch Fehler in `app/` haben, die Tasks 7–8 beheben.
- [ ] **Step 8: Commit** `refactor!: Schema auf Projekttage, Projekte und Schülerkonten umgestellt`

### Task 7: Backend Staff – Projekttage, Projekte, Schülerverwaltung

**Files:**
- Delete:
  - `app/api/groups/`, `app/api/enrollments/`, `app/api/projects/[id]/enrollments/`
  - `lib/pin.ts`, `tests/pin.test.ts`
- Replace: `lib/projects.ts`. Enthält die Selects und Serializer für `ProjectDay` und `Project` sowie die folgenden Funktionen:
  - `findProjectDay(id)`. Alle Lehrer und der Super User haben Zugriff, sonst 404.
  - `findAccessibleProject(session, id)`. Prüft mit `projectAccessFilter`, sonst 404.
  - `assertImageUsable(imageId, owner: { projectDayId?: string; projectId?: string })`.
- Create: `lib/preferencesMaintenance.ts` mit `pruneInvalidPreferences(tx: Prisma.TransactionClient, scope: { projectDayId?: string; studentIds?: string[] }): Promise<void>`.
  - Löscht Präferenzen, deren Projekt die Klasse des Schülers ausschließt oder deren Projekttag die Klasse des Schülers nicht mehr enthält.
  - Verdichtet danach die Ränge pro (Schüler, Projekttag) mit `compactRanks`. Das geschieht in zwei Phasen: zuerst alle betroffenen Ränge auf `rank + 10000`, dann auf `to`.
- Create: `lib/students.ts` mit `studentListSelect` (ohne Passwortfelder) und `takenUsernames(tx): Promise<Set<string>>`.
- Create/Replace routes:
  - `app/api/project-days/route.ts`: GET listet alle für SUPERUSER und TEACHER. POST nur, wenn `canManageProjectDays`, sonst 403, Code über `generateUniqueProjectCode` (nutzt `prisma.projectDay`).
  - `app/api/project-days/[id]/route.ts`: GET (SUPERUSER, TEACHER), PATCH und DELETE nur für SUPERUSER. PATCH läuft in **einer** Transaktion: Klassen setzen, nicht mehr enthaltene Klassen aus `excludedClasses` aller Projekte des Tags entfernen, dann `pruneInvalidPreferences(tx, { projectDayId })`.
  - `app/api/projects/route.ts`: GET `?projectDayId=` filtert mit `projectAccessFilter`. POST: Owner ist der Lehrer selbst. Beim Super User wird optional `assignedOwnerId` geprüft, wie bisher in `app/api/projects/route.ts`. Bei `invalidExcludedClassIds` ungleich leer antwortet die Route mit 400.
  - `app/api/projects/[id]/route.ts`: PATCH (bei geänderten `excludedClassIds` mit `pruneInvalidPreferences` in der Transaktion) und DELETE (danach Ränge verdichten).
  - `app/api/students/route.ts`:
    - GET gibt `studentListSelect` zurück, optional gefiltert mit `?classId=`.
    - POST: Doppelte prüfen wie bisher, dann `assignUsernames` und `createStudentCredentials`. Antwort ist `201` mit `{ ...student, password }`.
    - Ist `buildUsernameBase` leer, antwortet die Route mit 400 „Name enthält keine gültigen Buchstaben.“.
  - `app/api/students/[id]/route.ts`: PATCH berechnet den Anmeldenamen neu, wenn sich der Name ändert. Bei einem Klassenwechsel zählt es `sessionVersion` hoch und ruft `pruneInvalidPreferences`. DELETE.
  - `app/api/students/[id]/password/route.ts`: POST mit neuen Credentials und `sessionVersion + 1`. Antwort `{ username, password }`.
  - `app/api/students/import/route.ts`: POST mit `req.formData()`, Feld `file`.
    - Größe prüfen, dann `parseStudentWorkbook` und `planImport`.
    - Gibt es Fehler, antwortet die Route mit 400 `{ errors }`.
    - Sonst werden alle Schüler in **einer** `$transaction` angelegt: Anmeldenamen über `takenUsernames` und `assignUsernames`, Credentials pro Schüler.
    - Antwort `{ created: number, skipped: ImportIssue[], studentIds: string[] }`.
  - `app/api/students/pdf/route.ts`: POST mit `studentsPdfRequestSchema`. Lädt die Schüler sortiert nach Klasse (`sortOrder`), Nachname und Vorname, entschlüsselt die Passwörter, ruft `renderCredentialsPdf` und setzt die Header gemäß Global Constraints. Im Dateinamen steht der Klassenname, `alle` (ohne Filter) oder `neu` (bei `studentIds`).
  - Alle Schüler-Routen sind nur für SUPERUSER.
- Modify: `app/api/upload/route.ts:29` → `where: { projectDay: null, project: null, … }`
- Modify: `lib/projectCode.ts`. `generateUniqueProjectCode` nutzt jetzt `prisma.projectDay`.
- Test: `tests/preferencesMaintenance.test.ts` mit einem gemockten `tx`. Er prüft die zwei Phasen: Kein `update` setzt direkt einen Zielrang, solange ein anderer Datensatz diesen Rang noch hält. Die Reihenfolge der Aufrufe wird aufgezeichnet.

- [ ] **Step 1: Write the failing test** `tests/preferencesMaintenance.test.ts`. Ränge `[1,3,4]` mit dem Ziel `[1,2,3]`: Die Aufrufe gehen zuerst auf `>10000` und erst danach auf die Zielränge.
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3: Implement** `lib/preferencesMaintenance.ts`
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Implement** die übrigen Libs und Routen oben. Alte Routen und PIN-Code löschen.
- [ ] **Step 6:** Run `npm test` → PASS. Bei `npx tsc --noEmit` dürfen nur noch Fehler in `lib/auth.ts`, `app/api/student/**`, `types/` und Frontend-Seiten übrig sein.
- [ ] **Step 7: Commit** `feat: API für Projekttage, Projekte und Schülerverwaltung`

### Task 8: Schüler-Login & Schüler-API

**Files:**
- Modify: `lib/auth.ts`, Provider `student-login` gemäß Spec §6.3.
  - Credentials sind `code`, `username` und `password`.
  - Rate-Limit-Key: `` `student:${ip}:${code}:${normalizeLoginName(username)}` ``.
  - Eingaben laufen durch `normalizeLoginName` (Anmeldename) und `.trim().toUpperCase()` (Code).
  - Bei einem Fehler gibt der Provider immer `null` zurück, ohne zu verraten, welcher Teil falsch war.
  - `jwt`/`session` übernehmen `projectDayId` und `sessionVersion`, `enrollmentId` und `projectId` entfallen.
- Modify: `types/next-auth.d.ts` mit `projectDayId?: string` und `sessionVersion?: number`.
- Create: `lib/studentSession.ts` mit `requireStudent(): Promise<{ studentId: string; schoolClassId: string; projectDay: { id: string; enrollmentDeadline: Date } }>`.
  - Nutzt `requireRole("STUDENT")`, lädt den Schüler und die Klassen-IDs des Tags und prüft mit `isStudentSessionValid`.
  - Schlägt die Prüfung fehl, wirft die Funktion `ApiError(401, "Sitzung abgelaufen. Bitte neu anmelden.")`.
- Delete: `app/api/student/groups/`
- Create: `app/api/student/projects/route.ts`. Antwort `{ projectDay: { id, name, description, bannerImage, enrollmentDeadline }, deadlinePassed, projects: [{ id, name, description, bannerImage, maxStudents, priority }] }`. Die Projekte kommen über `studentVisibleProjectsWhere`.
- Modify: `app/api/student/priorities/route.ts`.
  - Body `{ projectId, priority }` bzw. `?projectId=` bei DELETE.
  - Das Projekt muss in `studentVisibleProjectsWhere` liegen, sonst 404.
  - `priority` darf höchstens so groß sein wie die Zahl der sichtbaren Projekte.
  - Die Frist wird geprüft.
  - Das „Wandern“ der Priorität bleibt wie bestehend, mit `studentId` und `projectDayId`.
- Test: `tests/auth.studentLogin.test.ts`. `@/lib/prisma` wird gemockt wie in `tests/projectCode.test.ts`, die `authorize`-Funktion des Providers wird direkt aufgerufen.
  - Bei gültigen Daten mit Groß-/Kleinschreibung und Leerzeichen kommt ein User mit `role:"STUDENT"` und `projectDayId` zurück.
  - Ist die Klasse nicht im Tag, kommt `null`.
  - Ist das Passwort falsch, kommt `null`.
  - Ist der Code unbekannt, kommt `null`.

- [ ] **Step 1: Write the failing test** `tests/auth.studentLogin.test.ts`
- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3: Implement** `lib/auth.ts`, die Typen, `lib/studentSession.ts` und die Schüler-Routen.
- [ ] **Step 4:** Run `npm test` → PASS. Bei `npx tsc --noEmit` dürfen nur noch Fehler in Frontend-Seiten bzw. `components/` übrig sein.
- [ ] **Step 5: Commit** `feat: Schüler-Login mit Projekttag-Code, Anmeldename und Passwort`

### Task 9: Frontend – Navigation, Projekttage & Projekte

**Files:**
- Delete: `app/projects/`, `app/groups/` (Seiten)
- Create:
  - `app/projekttage/page.tsx`: Liste als Karten mit Name, Zeitraum, Frist, Klassen und Code. Der Button „+ Projekttag anlegen“ erscheint nur für den Super User.
  - `app/projekttage/new/page.tsx` und `app/projekttage/[id]/edit/page.tsx`: gemeinsame Komponente `components/ProjectDayForm.tsx`, basierend auf dem alten `app/projects/new/page.tsx`, ohne Schüleranzahl und ohne Lehrerauswahl. Die Seiten sind nur für den Super User.
  - `app/projekttage/[id]/page.tsx`:
    - Kopf mit den Daten des Projekttags. Der Super User sieht dort „Bearbeiten“ und „Löschen“, letzteres mit Rückfrage.
    - Darunter die Liste der Projekte aus `GET /api/projects?projectDayId=`.
    - Jede Karte zeigt Name, maximale Schülerzahl, Lehrer und „ohne: 5a, 5b“.
    - Dazu „+ Projekt anlegen“ sowie Bearbeiten und Löschen.
  - `app/projekttage/[id]/projekte/new/page.tsx` und `…/[projectId]/edit/page.tsx`: gemeinsame Komponente `components/ProjectForm.tsx`, basierend auf `app/groups/new/page.tsx`. Sie enthält Checkboxen „Klassen ausschließen“ mit den Klassen des Tags und, nur für den Super User, „Lehrer zuordnen“ aus `/api/teachers`.
- Modify: `components/Sidebar.tsx`
  - Die Einträge „Projekte“ und „Gruppen“ werden durch „Projekttage“ (`/projekttage`) ersetzt.
  - „Schüler“ (`/schueler-verwaltung`) erscheint nur für den Super User.
  - Die Unterliste zeigt die Projekttage aus `/api/project-days` mit Link auf `/projekttage/<id>`, ohne den Auslastungsbalken.
- Modify: `proxy.ts`. Lehrerbereich sind `/projekttage`, `/schueler-verwaltung` und `/settings`. `/schueler-verwaltung` und `/settings` sind nur für den Super User, alle Weiterleitungen auf `/projects` werden zu `/projekttage`. Der `matcher` wird entsprechend angepasst.
- Modify: `app/page.tsx` und `app/lehrer/page.tsx`: Weiterleitung auf `/projekttage`.

- [ ] **Step 1: Implement** die Seiten und Komponenten oben.
- [ ] **Step 2:** Run `npx tsc --noEmit`. Es dürfen nur noch Fehler in `app/settings`, `app/schueler` und `app/student` übrig sein.
- [ ] **Step 3: Manuell prüfen** mit dem Skill `run` oder `browser-automation`, `npm run dev` auf Port 3111:
  - Der Super User legt einen Projekttag an.
  - Ein Lehrer sieht diesen Projekttag, aber keinen Button „Anlegen“, legt ein Projekt mit ausgeschlossener Klasse an und sieht nur dieses Projekt.
  - Der Super User sieht alle Projekte.
- [ ] **Step 4: Commit** `feat: Oberfläche für Projekttage und Projekte`

### Task 10: Frontend – Schülerverwaltung, Login, Schülerseite

**Files:**
- Create: `app/schueler-verwaltung/page.tsx`
  - Klassenfilter und Tabelle mit Nachname, Vorname, Klasse und Anmeldename, je Zeile die Aktionen Bearbeiten (inline), Löschen (mit Rückfrage) und „Neues Passwort“ (zeigt das Ergebnis einmal in einem Hinweis).
  - Formular „Schüler anlegen“. Nach dem Anlegen erscheinen Anmeldename und Passwort einmal.
  - Upload „Excel importieren“ zeigt die Fehlerliste mit Zeilennummern oder das Ergebnis mit „N angelegt, M übersprungen“ samt Liste der übersprungenen und den Button „PDF der neuen Schüler“.
  - „PDF erzeugen“ mit Auswahl „Alle Klassen“ oder einer Klasse. Der Download läuft über `fetch` → `blob` → Objekt-URL.
  - Ein Hinweis zum Excel-Format nennt die Spalten `Vorname`, `Nachname`, `Klasse`.
- Modify: `app/settings/page.tsx`. Der Bereich „Schüler“ und alle Aufrufe von `/api/projects` bzw. Enrollments werden entfernt, die Lehrerverwaltung bleibt.
- Modify: `app/schueler/page.tsx`
  - Felder: „Projekttag-Code“, „Anmeldename“ (Platzhalter `vorname.nachname`) und „Passwort“.
  - `signIn("student-login", { code, username, password })`.
- Modify: `app/student/page.tsx`
  - Datenquelle wird `/api/student/projects`, Texte wechseln von „Gruppe/Projekt“ zu „Projekt/Projekttag“.
  - Prioritäten werden mit `projectId` gesendet.
  - Bei `401` leitet die Seite per `signOut` mit `callbackUrl: "/schueler"` zum Login.

- [ ] **Step 1: Implement** die Seiten oben.
- [ ] **Step 2:** Run `npx tsc --noEmit` → keine Fehler. `npm test` → PASS. `npx next build` → Erfolg (ohne das `build`-Script, das migrieren würde).
- [ ] **Step 3: Manuell prüfen** mit dem Skill `run` oder `browser-automation`:
  - Excel mit 3 Schülern importieren, darunter ein Doppelname und ein Umlaut.
  - PDF herunterladen. Sie hat eine Seite pro Klasse und zeigt Anmeldenamen und Passwörter.
  - Ein Schüler meldet sich mit Code, Anmeldename und Passwort an. Er sieht kein Projekt, das seine Klasse ausschließt, und vergibt Prioritäten.
  - „Neues Passwort“ erzeugen. Die alte Session des Schülers bekommt beim nächsten Klick 401 und landet beim Login.
- [ ] **Step 4: Commit** `feat: Schülerverwaltung mit Import/PDF und neuer Schüler-Login`
