import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dns from "dns";

const ENV_PATH = path.join(process.cwd(), ".env.local");

// DNS Fix for querySrv ECONNREFUSED
const fixDns = () => {
  try {
    const currentServers = dns.getServers();
    if (currentServers.length === 1 && currentServers[0] === "127.0.0.1") {
      dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
      console.log("[MongoDB DNS] Switched to Google DNS");
    }
    dns.setDefaultResultOrder("ipv4first");
  } catch (err) {
    console.warn("[MongoDB DNS] Error:", err);
  }
};

fixDns();

function loadDotEnvLocal(): void {
  if (!fs.existsSync(ENV_PATH)) return;
  const envContent = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) global.mongooseCache = cached;

async function dbConnect(): Promise<typeof mongoose> {
  loadDotEnvLocal();
  const srvUri = process.env.MONGODB_URI;

  if (!srvUri) {
    throw new Error("MONGODB_URI is missing in .env.local!");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // Chỉ đợi 5 giây để báo lỗi ngay
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
      family: 4, // Ép dùng IPv4
    };

    // Mask URI for security but show cluster name
    const maskedUri = srvUri.replace(/\/\/.*@/, "//USER:PASSWORD@");
    console.log(`[MongoDB] Attempting connection to: ${maskedUri}`);
    
    fixDns();
    cached.promise = mongoose.connect(srvUri, opts).then((m) => {
      console.log("[MongoDB] ✅ Connected successfully");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    const error = err as any;
    console.error(`[MongoDB Error] Code: ${error.code}, Message: ${error.message}`);
    
    throw new Error("KHÔNG THỂ KẾT NỐI: Mạng của bạn đang chặn cổng 27017. Hãy thử dùng 4G hoặc VPN.");
  }
  return cached.conn;
}

async function attemptConnection(primaryUri: string, fallbackUri?: string): Promise<typeof mongoose> {
  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000, // Giảm xuống để fallback nhanh hơn
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
  };

  const isSrv = primaryUri.includes("+srv");
  console.log(`[MongoDB] Connecting to ${isSrv ? "SRV" : "Direct Node"}...`);

  try {
    fixDns();
    // Thử kết nối với URI ưu tiên
    return await mongoose.connect(primaryUri, opts);
  } catch (err) {
    const error = err as Error;
    console.error(`[MongoDB] ⚠️ Primary connection failed: ${error.message}`);

    if (fallbackUri && fallbackUri !== primaryUri) {
      console.log("[MongoDB] 🔄 Attempting fallback connection...");
      try {
        return await mongoose.connect(fallbackUri, opts);
      } catch (fallbackErr) {
        console.error(`[MongoDB] ❌ Fallback failed: ${(fallbackErr as Error).message}`);
        throw fallbackErr;
      }
    }
    throw err;
  }
}

export default dbConnect;
