import {
  buildMockResume,
  enhanceResume as enhanceMockResume,
  getMockResumes,
  saveMockResume,
} from "./mockApi";

/*
 * =========================================================
 * RESUME SERVICE
 *
 * The UI talks to this service layer.
 *
 * Currently this uses the mock API.
 * Later these functions can call the Express backend
 * without changing the UI.
 * =========================================================
 */

export async function buildResume(payload) {
  return buildMockResume(payload);
}

export async function enhanceResume(payload) {
  return enhanceMockResume(payload);
}

export async function getResumes() {
  return getMockResumes();
}

export async function saveResume(payload) {
  return saveMockResume(payload);
}