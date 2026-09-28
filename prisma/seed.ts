import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedSuperuser() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Superuser 'admin' existiert bereits, überspringe Seed.");
    return;
  }
  const passwordHash = await bcrypt.hash("test1234", 10);
  await prisma.user.create({
    data: { username: "admin", passwordHash, role: "SUPERUSER" },
  });
  console.log("Superuser 'admin' wurde erstellt (Passwort: test1234).");
}

async function seedSchoolClasses() {
  const classNames: string[] = [];
  for (let grade = 5; grade <= 12; grade++) {
    classNames.push(`${grade}a`);
    classNames.push(`${grade}b`);
  }

  let order = 1;
  for (const name of classNames) {
    const existing = await prisma.schoolClass.findUnique({ where: { name } });
    if (!existing) {
      await prisma.schoolClass.create({ data: { name, sortOrder: order } });
      console.log(`Schulklasse '${name}' wurde erstellt.`);
    }
    order++;
  }
}

async function main() {
  await seedSuperuser();
  await seedSchoolClasses();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
