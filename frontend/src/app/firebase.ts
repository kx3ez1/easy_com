import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBlQdp3NESL5NAgtSyydyfY2IKEB1Vcn_k",
  authDomain: "e-commerce-34ab7.firebaseapp.com",
  projectId: "e-commerce-34ab7",
  storageBucket: "e-commerce-34ab7.firebasestorage.app",
  messagingSenderId: "495200406055",
  appId: "1:495200406055:web:91cf6f79c7bc11f25f5c02",
  measurementId: "G-8153BZ2TVK"
};

// Initialize Firebase (safeguarded for HMR in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Analytics is only supported in browser environments
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, analytics };
