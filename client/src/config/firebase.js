import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_MediQueue_Firebase_App_Key_2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mediqueue-hospital.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mediqueue-hospital',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mediqueue-hospital.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '892738491029',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:892738491029:web:a7b8c9d0e1f234567890ab',
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure language to user browser language or English
auth.useDeviceLanguage();

export { RecaptchaVerifier, signInWithPhoneNumber };
export default app;
