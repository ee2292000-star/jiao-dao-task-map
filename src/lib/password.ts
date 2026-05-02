import { createHash } from "crypto";

export function hashPassword(password: string) {
  const pepper = process.env.AUTH_PASSWORD_PEPPER ?? process.env.NEXTAUTH_SECRET ?? "";
  return createHash("sha256").update(`${pepper}:${password}`).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string) {
  return hashPassword(password) === passwordHash;
}
