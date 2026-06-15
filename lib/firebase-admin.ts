import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brakuje zmiennej środowiskowej: ${name}`);
  }
  return value;
}

export function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: required("FIREBASE_PROJECT_ID"),
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")
      })
    });
  }

  return getFirestore();
}
