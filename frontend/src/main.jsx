import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/portfolio.css";

import App from "./app/App";
import "./styles/index.css";

// After a deploy, a tab that was already open asks for code files that no
// longer exist. Reload once to get the new ones. The time check stops a loop
// if the files are really missing.
window.addEventListener("vite:preloadError", (event) => {
  const key = "wf-reloaded-at";
  let last;
  try {
    last = Number(sessionStorage.getItem(key)) || 0;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return; // Storage blocked: we can't guard against a loop, so don't reload.
  }
  if (Date.now() - last < 10000) return;
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);