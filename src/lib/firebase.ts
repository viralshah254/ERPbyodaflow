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

const REMEMBER_ME_UNTIL_KEY = "odaflow_remember_me_until";
const REMEMBER_ME_DAYS = 30;

export function getRememberMeUntil(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REMEMBER_ME_UNTIL_KEY);
    if (!raw) return null;
    return parseInt(raw, 10);
  } catch {
    return null;
  }
}

export function setRememberMeUntil(): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(REMEMBER_ME_UNTIL_KEY, String(until));
}

export function clearRememberMeUntil(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REMEMBER_ME_UNTIL_KEY);
}

export function isRememberMeExpired(): boolean {
  const until = getRememberMeUntil();
  if (!until) return false;
  return Date.now() > until;
}

async function getClientAuth() {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is only available in the browser");
  }
  const { getApp, getApps, initializeApp } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
}

export function isFirebaseConfigured(): boolean {
  return !!(
    typeof window !== "undefined" &&
    firebaseConfig.apiKey &&
    firebaseConfig.projectId
  );
}

/**
 * Sign in with email/password and return the Firebase ID token for the backend.
 * @param rememberMe - If true, use local persistence (30 days). If false, use session persistence (until tab closes).
 */
export async function signInAndGetIdToken(
  email: string,
  password: string,
  rememberMe = false
): Promise<string> {
  const auth = await getClientAuth();
  const { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } =
    await import("firebase/auth");
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  return token;
}

/**
 * Get current ID token (e.g. after page reload). Returns null if not signed in.
 */
export async function getIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const auth = await getClientAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = await getClientAuth();
  const { sendPasswordResetEmail } = await import("firebase/auth");
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign out the current user. Call this on logout so the next visit does not restore session.
 */
export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  clearRememberMeUntil();
  try {
    const auth = await getClientAuth();
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
  } catch {
    // Ignore if Firebase not configured or already signed out
  }
}
