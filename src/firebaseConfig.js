// Firebase Configuration
// =====================
// Ganti placeholder di bawah dengan konfigurasi dari Firebase Console:
// Firebase Console → ⚙️ Project Settings → Your Apps → Web App
//
// Jika belum punya project, buat di: https://console.firebase.google.com/
// 1. Klik "Add Project" → beri nama (misal: "kasir-pos")
// 2. Setelah project dibuat → klik ikon Web (</>) untuk menambah Web App
// 3. Copy firebaseConfig yang diberikan ke bawah ini

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBdc-SygbFe5OlR6KWnh44Vaw_Qt9UNGWU",
  authDomain: "tipsypoint-ad675.firebaseapp.com",
  projectId: "tipsypoint-ad675",
  storageBucket: "tipsypoint-ad675.firebasestorage.app",
  messagingSenderId: "607578824403",
  appId: "1:607578824403:web:a1b8a691326d73a31d3e26",
  measurementId: "G-6756Z5HRJ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);
const auth = getAuth(app);
const authReady = signInAnonymously(auth);

export { db, auth, authReady };
export default app;
