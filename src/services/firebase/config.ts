import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase - Document 03/04 Firebase Integration.
 * Single source of truth for the initialized app, auth, and db
 * instances. Every other file imports from here - never call
 * initializeApp() anywhere else.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function assertConfigIsPresent() {
  const missing = Object.entries(firebaseConfig).filter(([key, value]) => {
    if (key === "measurementId") return false; // optional
    return !value;
  });

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      "Missing Firebase environment variables:",
      missing.map(([key]) => key).join(", ")
    );
  }
}

assertConfigIsPresent();

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
