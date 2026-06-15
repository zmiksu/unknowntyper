import { NextResponse } from "next/server";
import { createSessionCookie, hashPin } from "@/lib/auth";
import { createUser, getUserByLogin } from "@/lib/repositories";

function normalizeLogin(raw: string) {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_\-.]/g, "");
  return {
    login: cleaned,
    loginLower: cleaned.toLowerCase()
  };
}

function isValidPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: string; pin?: string };
    const { login, loginLower } = normalizeLogin(body.login ?? "");
    const pin = (body.pin ?? "").trim();

    if (!login || login.length < 3) {
      return NextResponse.json({ error: "Login musi mieć minimum 3 znaki." }, { status: 400 });
    }

    if (!isValidPin(pin)) {
      return NextResponse.json({ error: "PIN musi mieć od 4 do 8 cyfr." }, { status: 400 });
    }

    const existing = await getUserByLogin(loginLower);
    if (existing) {
      return NextResponse.json({ error: "Taki login już istnieje." }, { status: 409 });
    }

    await createUser({
      login,
      loginLower,
      pinHash: await hashPin(pin),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });

    await createSessionCookie({ userId: loginLower, login });

    return NextResponse.json({ ok: true, user: { login, userId: loginLower } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się utworzyć konta." }, { status: 500 });
  }
}
