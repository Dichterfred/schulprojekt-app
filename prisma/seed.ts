import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PASSWORD_MIN_LENGTH } from "../lib/validation";

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

async function main() {
  // Klassen zuerst, damit sie auch dann angelegt werden, wenn der Superuser-Schritt scheitert.
  await seedSchoolClasses();
  await seedSuperuser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
