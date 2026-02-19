import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7nm-WSNqOTV7hZqsBffUbO64MwReOw9M",
  authDomain: "epilog-23a6d.firebaseapp.com",
  projectId: "epilog-23a6d",
  storageBucket: "epilog-23a6d.firebasestorage.app",
  messagingSenderId: "834937644374",
  appId: "1:834937644374:web:b909242bb2adfb920422f7",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
