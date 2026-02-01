// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace this with your actual Firebase config from Step 3
const firebaseConfig = {
  apiKey: "AIzaSyDFBY6w7jc4TPyFaR3RQE2JDWCwuxEVozE",
  authDomain: "pos-system-e610d.firebaseapp.com",
  projectId: "pos-system-e610d",
  storageBucket: "pos-system-e610d.firebasestorage.app",
  messagingSenderId: "1062035381312",
  appId: "1:1062035381312:web:64130875e81a7760d753a5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);