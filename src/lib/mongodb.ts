import mongoose from"mongoose";

/**
 * Global caching mechanism for Mongoose connection.
 *
 * In development, Next.js Hot Reload re-executes modules on every change.
 * Without caching, each reload would create a NEW connection to MongoDB,
 * quickly exhausting the connection pool and causing
 *"MongoServerError: too many open connections" errors.
 *
 * By storing the connection promise on `globalThis`, we reuse the same
 * connection across hot reloads. In production this has no effect since
 * modules are only evaluated once.
 */

interface MongooseCache {
 conn: typeof mongoose | null;
 promise: Promise<typeof mongoose> | null;
}

// Extend the NodeJS global type so TypeScript doesn't complain
declare global {
 // eslint-disable-next-line no-var
 var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongoose ?? {
 conn: null,
 promise: null,
};

// Persist the cache on globalThis so it survives Hot Reload
if (!globalThis.mongoose) {
 globalThis.mongoose = cached;
}

/**
 * Connect to MongoDB Atlas (or any MongoDB instance).
 * Returns the cached Mongoose instance if a connection already exists.
 */
async function dbConnect(): Promise<typeof mongoose> {
 const MONGODB_URI = process.env.MONGODB_URI;

 if (!MONGODB_URI) {
 throw new Error("❌ Vui lòng định nghĩa biến MONGODB_URI trong file .env.local"
 );
 }

 // 1. If we already have a live connection, return it immediately
 if (cached.conn) {
 return cached.conn;
 }

 // 2. If a connection is being established, wait for it
 if (!cached.promise) {
 const opts: mongoose.ConnectOptions = {
 bufferCommands: false, // Fail fast instead of buffering when disconnected
 };

 cached.promise = mongoose
 .connect(MONGODB_URI as string, opts)
 .then((mongooseInstance) => {
 return mongooseInstance;
 });
 }

 try {
 cached.conn = await cached.promise;
 } catch (err) {
 // Reset the promise so the next call retries the connection
 cached.promise = null;
 throw err;
 }

 return cached.conn;
}

export default dbConnect;
