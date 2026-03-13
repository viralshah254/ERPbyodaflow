/**
 * Firebase Auth client — used for sign-in and ID token.
 * Requires NEXT_PUBLIC_FIREBASE_* env vars from Firebase Console → Project settings.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return !!(
    typeof window !== "undefined" &&
    firebaseConfig.apiKey &&
    firebaseConfig.projectId
  );
}

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") return null;
  return getAuth(getFirebaseApp());
}

/**
 * Sign in with email/password and return the Firebase ID token for the backend.
 */
export async function signInAndGetIdToken(
  email: string,
  password: string
): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not configured");
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return token;
}

/**
 * Get current ID token (e.g. after page reload). Returns null if not signed in.
 */
export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
