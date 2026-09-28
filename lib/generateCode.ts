import { prisma } from "@/lib/prisma";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export async function generateUniqueProjectCode(): Promise<string> {
  let code = randomCode();
  let existing = await prisma.project.findUnique({ where: { code } });
  while (existing) {
    code = randomCode();
    existing = await prisma.project.findUnique({ where: { code } });
  }
  return code;
}
