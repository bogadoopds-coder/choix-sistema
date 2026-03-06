import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtib-PrztP3ASfHFAVeQw5dkQAJBptzVc",
  authDomain: "choix-sistemaintegradodeobras.firebaseapp.com",
  projectId: "choix-sistemaintegradodeobras",
  storageBucket: "choix-sistemaintegradodeobras.firebasestorage.app",
  messagingSenderId: "637059483811",
  appId: "1:637059483811:web:86fb1a38abea98661d5716"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
