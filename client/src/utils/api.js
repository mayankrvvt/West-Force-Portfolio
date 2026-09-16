import { auth } from "../firebase/firebase";

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest(endpoint, options = {}) {
  const tokenHeaders = await getAuthHeaders();
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...tokenHeaders,
    },
  });

  let result;
  try { result = await response.json(); }
  catch { throw new Error("The server returned an invalid response."); }
  if (!response.ok) throw new Error(result.message || "API request failed.");
  return result;
}

export async function uploadFile(endpoint, file) {
  if (!file) throw new Error("A file is required.");
  const tokenHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: tokenHeaders,
    body: formData,
  });

  let result;
  try { result = await response.json(); }
  catch { throw new Error("The server returned an invalid upload response."); }
  if (!response.ok) throw new Error(result.message || "File upload failed.");
  return result;
}
