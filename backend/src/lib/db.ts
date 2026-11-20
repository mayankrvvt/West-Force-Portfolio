import mongoose from "mongoose";
import { logger } from "./logger";

const STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export async function connectDB(uri: string | undefined): Promise<void> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Add it to backend/.env before starting the backend."
    );
  }

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info({ host: connection.connection.host }, "MongoDB connected");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

export function dbState(): string {
  return STATES[mongoose.connection.readyState] ?? "unknown";
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
