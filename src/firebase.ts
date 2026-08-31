import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAEAFr9MeUZSQrTL_wnIqf3UfrS5oviZTo",
  authDomain: "aviator-890e2.firebaseapp.com",
  projectId: "aviator-890e2",
  storageBucket: "aviator-890e2.firebasestorage.app",
  messagingSenderId: "443540934488",
  appId: "1:443540934488:web:cba03d32c2b28a0477df2d",
  measurementId: "G-NY8F0SQ59L"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore Database services
export const auth = getAuth(app);
export const db = getFirestore(app);
