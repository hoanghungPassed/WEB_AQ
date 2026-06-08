#!/usr/bin/env node

/**
 * Script kiểm tra DNS resolution cho MongoDB Atlas
 * Sử dụng: node scripts/test-dns-mongodb.js
 */

const dns = require("dns");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

console.log("\n🔍 === TEST DNS & MONGODB CONNECTION ===\n");

// 1. Check current DNS servers
console.log("1️⃣ Kiểm tra DNS servers hiện tại:");
const currentServers = dns.getServers();
console.log("   Servers:", currentServers);

// 2. Fix DNS if needed
console.log("\n2️⃣ Áp dụng DNS fix (nếu cần):");
if (currentServers.length === 1 && currentServers[0] === "127.0.0.1") {
  console.log("   ⚠️  Detected localhost-only DNS, switching to Google DNS");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  console.log("   ✅ DNS servers updated:", dns.getServers());
} else {
  console.log("   ✅ DNS servers look OK:", dns.getServers());
}

dns.setDefaultResultOrder("ipv4first");
console.log("   ✅ Set IPv4-first resolution order");

// 3. Test DNS resolution for MongoDB
console.log("\n3️⃣ Test DNS resolution cho MongoDB Atlas:");
const mongoHost = "aq-media-cluster.uwjtsq1.mongodb.net";
dns.resolveSrv(`_mongodb._tcp.${mongoHost}`, (err, addresses) => {
  if (err) {
    console.error(`   ❌ SRV lookup failed for ${mongoHost}:`, err.message);
  } else {
    console.log(`   ✅ SRV lookup succeeded! Found ${addresses.length} record(s)`);
    addresses.slice(0, 3).forEach((addr, i) => {
      console.log(`      [${i + 1}] ${addr.name}:${addr.port} (priority: ${addr.priority})`);
    });
  }
});

// Helper function to load .env.local
function loadDotEnvLocal() {
  const ENV_PATH = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(ENV_PATH)) {
    console.warn("   ⚠️  .env.local not found");
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

// 4. Test A record lookup
dns.resolve4(mongoHost, (err, addresses) => {
  if (err) {
    console.error(`   ❌ A record lookup failed for ${mongoHost}:`, err.message);
  } else {
    console.log(`   ✅ A record lookup succeeded! Addresses:`, addresses.slice(0, 3).join(", "));
  }
});

// 5. Test MongoDB connection
setTimeout(async () => {
  console.log("\n4️⃣ Test kết nối MongoDB:");
  
  // Load .env.local
  loadDotEnvLocal();
  
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("   ❌ MONGODB_URI not found in .env.local");
    process.exit(1);
  }
  
  console.log(`   Connecting to: ${MONGODB_URI.replace(/:[^:]*@/, ":***@")}`);
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      family: 4,
    });
    console.log("   ✅ MongoDB connection successful!");
    await mongoose.disconnect();
    console.log("   ✅ Disconnected successfully");
  } catch (err) {
    console.error("   ❌ MongoDB connection failed:", err.message);
  }
  
  console.log("\n✨ Test completed!\n");
  process.exit(0);
}, 500);

