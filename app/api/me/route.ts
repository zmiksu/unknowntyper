import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPickMap } from "@/lib/repositories";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, picks: {} });
  }

  const picks = await getPickMap(session.userId);
  return NextResponse.json({ user: session, picks });
}
