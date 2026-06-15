import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { AppUser, LeaderboardEntry, MatchDoc, PickDoc } from "@/lib/types";

export async function getUserByLogin(loginLower: string): Promise<AppUser | null> {
  const snapshot = await getDb().collection("users").doc(loginLower).get();
  return snapshot.exists ? (snapshot.data() as AppUser) : null;
}

export async function createUser(user: AppUser) {
  await getDb().collection("users").doc(user.loginLower).set(user);
}

export async function touchUser(loginLower: string) {
  await getDb().collection("users").doc(loginLower).set(
    {
      lastLoginAt: new Date().toISOString()
    },
    { merge: true }
  );
}

export async function listUsers(): Promise<AppUser[]> {
  const snapshot = await getDb().collection("users").get();
  return snapshot.docs.map((doc) => doc.data() as AppUser);
}

export async function upsertMatches(matches: MatchDoc[]) {
  const batch = getDb().batch();
  for (const match of matches) {
    const ref = getDb().collection("matches").doc(match.matchId);
    batch.set(ref, match, { merge: true });
  }
  await batch.commit();
}

export async function listMatches(): Promise<MatchDoc[]> {
  const snapshot = await getDb().collection("matches").orderBy("kickoffUtc", "asc").get();
  return snapshot.docs.map((doc) => doc.data() as MatchDoc);
}

export async function getPickMap(userId: string): Promise<Record<string, PickDoc>> {
  const snapshot = await getDb().collection("picks").where("userId", "==", userId).get();
  const entries = snapshot.docs.map((doc) => doc.data() as PickDoc);
  return Object.fromEntries(entries.map((pick) => [pick.matchId, pick]));
}

export async function saveUserPicks(
  userId: string,
  login: string,
  picks: Array<{ matchId: string; homeScore: number | null; awayScore: number | null }>
) {
  const batch = getDb().batch();
  const now = new Date().toISOString();

  for (const pick of picks) {
    const ref = getDb().collection("picks").doc(`${userId}_${pick.matchId}`);

    if (pick.homeScore === null || pick.awayScore === null) {
      batch.delete(ref);
      continue;
    }

    batch.set(ref, {
      userId,
      login,
      matchId: pick.matchId,
      homeScore: pick.homeScore,
      awayScore: pick.awayScore,
      updatedAt: now
    } satisfies PickDoc);
  }

  await batch.commit();
}

export async function listPicks(): Promise<PickDoc[]> {
  const snapshot = await getDb().collection("picks").get();
  return snapshot.docs.map((doc) => doc.data() as PickDoc);
}

export async function replaceLeaderboard(entries: LeaderboardEntry[]) {
  const batch = getDb().batch();
  const collection = getDb().collection("leaderboard");
  const old = await collection.get();
  old.docs.forEach((doc) => batch.delete(doc.ref));
  entries.forEach((entry) => batch.set(collection.doc(entry.userId), entry));
  await batch.commit();
}

export async function listLeaderboard(): Promise<LeaderboardEntry[]> {
  const snapshot = await getDb().collection("leaderboard").orderBy("points", "desc").get();
  return snapshot.docs
    .map((doc) => doc.data() as LeaderboardEntry)
    .sort((a, b) => (b.points !== a.points ? b.points - a.points : a.login.localeCompare(b.login, "pl")));
}

export async function setMeta(key: string, value: unknown) {
  await getDb().collection("meta").doc(key).set({
    value,
    updatedAt: FieldValue.serverTimestamp()
  });
}
