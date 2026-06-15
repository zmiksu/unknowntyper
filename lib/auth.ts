import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import type { SessionPayload } from "@/lib/types";

const SESSION_COOKIE = "wc26_session";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Brakuje SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(pin, salt);
  return `${salt}:${derivedKey}`;
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt, original] = storedHash.split(":");
  if (!salt || !original) return false;
  const derivedKey = await scryptAsync(pin, salt);
  return crypto.timingSafeEqual(Buffer.from(original), Buffer.from(derivedKey));
}

function scryptAsync(pin: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pin, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key.toString("hex"));
    });
  });
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, sessionSecret());
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}
