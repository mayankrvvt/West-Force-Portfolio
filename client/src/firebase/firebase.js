import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBauTv1D0-VgvfCo6T3rP1Vwp3_LmBPhIY",

  authDomain: "westforce-portfolio.firebaseapp.com",

  projectId: "westforce-portfolio",

  storageBucket: "westforce-portfolio.firebasestorage.app",

  messagingSenderId: "445317323933",

  appId: "1:445317323933:web:b8f9acef07d4c681b5c874",

  measurementId: "G-Q981BWK7B3",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const functions = getFunctions(
  app,
  "us-central1"
);


export default app;