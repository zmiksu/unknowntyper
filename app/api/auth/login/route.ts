import { NextResponse } from "next/server";
import { createSessionCookie, verifyPin } from "@/lib/auth";
import { getUserByLogin, touchUser } from "@/lib/repositories";

function normalizeLogin(raw: string) {
  return raw.trim().replace(/[^a-zA-Z0-9_\-.]/g, "").toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: string; pin?: string };
    const loginLower = normalizeLogin(body.login ?? "");
    const pin = (body.pin ?? "").trim();

    const user = await getUserByLogin(loginLower);
    if (!user) {
      return NextResponse.json({ error: "Nie znaleziono takiego użytkownika." }, { status: 404 });
    }

    const valid = await verifyPin(pin, user.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Nieprawidłowy PIN." }, { status: 401 });
    }

    await touchUser(loginLower);
    await createSessionCookie({ userId: user.loginLower, login: user.login });

    return NextResponse.json({ ok: true, user: { login: user.login, userId: user.loginLower } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zalogować." }, { status: 500 });
  }
}
