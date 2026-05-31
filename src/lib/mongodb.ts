import dns from "dns";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const ENV_PATH = path.join(process.cwd(), ".env.local");

function loadDotEnvLocal(): void {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  const envContent = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

// Bắt buộc Node.js luôn dùng Google DNS để vượt Tường lửa nhà mạng
function ensureDnsServers(): void {
  try {
    console.log('DEBUG before setServers:', dns.getServers());
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    console.log('DEBUG after setServers:', dns.getServers());
  } catch (error) {
    console.log("⚠️ Không thể ghi đè DNS, tiếp tục dùng mặc định...");
    console.error(error);
  }
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongoose ?? {
  conn: null,
  promise: null,
};

if (!globalThis.mongoose) {
  globalThis.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  loadDotEnvLocal();
  ensureDnsServers(); // Gọi hàm ép DNS

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("❌ Vui lòng định nghĩa biến MONGODB_URI trong file .env.local");
  }

  console.log('DEBUG dbConnect MONGODB_URI=', MONGODB_URI.slice(0, 40) + (MONGODB_URI.length > 40 ? '...' : ''));
  console.log('DEBUG dbConnect dns.getServers before resolveSrv=', dns.getServers());
  await new Promise<void>((resolve) => {
    dns.resolveSrv('_mongodb._tcp.aq-media-cluster.uwjtsq1.mongodb.net', (err, records) => {
      console.log('DEBUG resolveSrv err=', err);
      console.log('DEBUG resolveSrv records=', records);
      resolve();
    });
  });

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // Tăng lên 30 giây để tránh lỗi kết nối ảo
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default dbConnect;