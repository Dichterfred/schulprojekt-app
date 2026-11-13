import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PASSWORD_MIN_LENGTH } from "../lib/validation";
import { assignUsernames } from "../lib/username";
import { createStudentCredentials, loadPasswordKey } from "../lib/studentPassword";
import { slugifyProjectName } from "../lib/projectCode";

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || "admin";

async function seedSuperuser() {
  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existing) {
    console.log(`Superuser '${ADMIN_USERNAME}' existiert bereits, überspringe.`);
    return;
  }
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD muss gesetzt sein (mind. ${PASSWORD_MIN_LENGTH} Zeichen), um den ersten Superuser anzulegen.`
    );
  }
  await prisma.user.create({
    data: { username: ADMIN_USERNAME, passwordHash: await bcrypt.hash(password, 10), role: "SUPERUSER" },
  });
  console.log(`Superuser '${ADMIN_USERNAME}' wurde erstellt.`);
}

async function seedSchoolClasses() {
  let sortOrder = 1;
  for (let grade = 5; grade <= 12; grade++) {
    for (const letter of ["a", "b"]) {
      const name = `${grade}${letter}`;
      await prisma.schoolClass.upsert({ where: { name }, update: {}, create: { name, sortOrder } });
      sortOrder++;
    }
  }
  console.log("Schulklassen 5a–12b vorhanden.");
}

const DEMO_NAME = "Demo-Projekttag";
// Gleiche Code-Erzeugung wie beim Anlegen per API (Großbuchstaben), damit der Login den Code findet.
const DEMO_CODE = slugifyProjectName(DEMO_NAME);
const DEMO_STUDENTS = [
  { firstName: "Anna", lastName: "Beispiel", className: "5a" },
  { firstName: "Ben", lastName: "Muster", className: "5a" },
  { firstName: "Clara", lastName: "Probe", className: "5b" },
  { firstName: "David", lastName: "Test", className: "5b" },
];

/** Optionale Demo-Daten (nur bei SEED_DEMO=true): ein Projekttag und vier Schüler. Idempotent. */
async function seedDemo() {
  // Zuerst prüfen, damit bei fehlendem Schlüssel nichts geschrieben wird.
  const key = loadPasswordKey();
  const classes = await prisma.schoolClass.findMany({ where: { name: { in: ["5a", "5b"] } } });
  const byName = new Map(classes.map((c) => [c.name, c.id]));
  for (const name of ["5a", "5b"]) {
    if (!byName.has(name)) throw new Error(`Demo-Seed: Klasse ${name} fehlt.`);
  }
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  await prisma.projectDay.upsert({
    where: { code: DEMO_CODE },
    update: {},
    create: {
      name: DEMO_NAME,
      description: "Beispieldaten für die lokale Entwicklung.",
      code: DEMO_CODE,
      startDate: new Date(now + 14 * day),
      endDate: new Date(now + 18 * day),
      enrollmentDeadline: new Date(now + 7 * day),
      schoolClasses: { connect: [...byName.values()].map((id) => ({ id })) },
    },
  });
  console.log(`Demo-Projekttag '${DEMO_CODE}' vorhanden.`);
  // Idempotenz pro Schüler: gleicher Vor-/Nachname in derselben Klasse wird übersprungen.
  const taken = new Set((await prisma.student.findMany({ select: { username: true } })).map((s) => s.username));
  const toCreate = [];
  for (const d of DEMO_STUDENTS) {
    const schoolClassId = byName.get(d.className)!;
    const exists = await prisma.student.findFirst({
      where: { firstName: d.firstName, lastName: d.lastName, schoolClassId },
      select: { id: true },
    });
    if (!exists) toCreate.push({ ...d, schoolClassId });
  }
  if (toCreate.length === 0) {
    console.log("Demo-Schüler existieren bereits, überspringe.");
    return;
  }
  console.log("Neue Demo-Schüler (Anmeldename / Passwort):");
  for (const s of assignUsernames(toCreate, taken)) {
    const { password, passwordHash, passwordEncrypted } = await createStudentCredentials(key);
    await prisma.student.create({
      data: {
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        passwordHash,
        passwordEncrypted,
        schoolClassId: s.schoolClassId,
      },
    });
    console.log(`  ${s.username} / ${password}`);
  }
}

async function main() {
  // Klassen zuerst, damit sie auch dann angelegt werden, wenn der Superuser-Schritt scheitert.
  await seedSchoolClasses();
  await seedSuperuser();
  if (process.env.SEED_DEMO === "true") await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
