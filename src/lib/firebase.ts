/**
 * Firebase Auth client — used for sign-in and ID token.
 * Requires NEXT_PUBLIC_FIREBASE_* env vars from Firebase Console → Project settings.
 * Uses dynamic import so the firebase package is only loaded in the browser.
 */
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

/**
 * Sign in with email/password and return the Firebase ID token for the backend.
 */
export async function signInAndGetIdToken(
  email: string,
  password: string
): Promise<string> {
  if (typeof window === "undefined")
    throw new Error("Firebase Auth is only available in the browser");
  const { getApp, getApps, initializeApp } = await import("firebase/app");
  const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return token;
}

/**
 * Get current ID token (e.g. after page reload). Returns null if not signed in.
 */
export async function getIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { getApp, getApps, initializeApp } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
