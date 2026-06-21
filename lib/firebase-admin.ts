// lib/firebase-admin.ts
import "server-only"; // ← Important: prevents client-side bundling

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (!adminApp) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  return adminApp;
}

// Initialize auth once
const adminAuth = getAuth(getAdminApp());

export async function verifyFirebaseToken(idToken: string) {
  return adminAuth.verifyIdToken(idToken);
}