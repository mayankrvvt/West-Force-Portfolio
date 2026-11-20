import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let server: MongoMemoryServer | undefined;

export async function startMongo() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  return mongoose;
}

export async function stopMongo() {
  await mongoose.disconnect();
  await server?.stop();
}
