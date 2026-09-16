import { supabase } from "./supabaseClient";

export async function signUpUser({
  fullName,
  email,
  password,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInUser({
  email,
  password,
}) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutUser() {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}