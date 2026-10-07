import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

export async function signUpUser({ fullName, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName) await updateProfile(credential.user, { displayName: fullName });
  return credential.user;
}

export async function signInUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOutUser() {
  await signOut(auth);
}
