#!/usr/bin/env node
/**
 * Quick test to verify MongoDB connection from Next.js context
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

// Apply DNS fix
const fixDns = () => {
  const servers = dns.getServers();
  console.log("[DNS] Current servers:", servers);
  if (servers.length === 1 && servers[0] === "127.0.0.1") {
    console.log("[DNS] Switching to Google DNS...");
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  }
  dns.setDefaultResultOrder("ipv4first");
};
fixDns();

// Load env
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

console.log("\n=== MONGODB CONNECTION TEST ===\n");
console.log("1. Testing with SRV URI:");
const srvUri = process.env.MONGODB_URI;
console.log("   URI:", srvUri.replace(/:[^:]*@/, ":***@"));

mongoose
  .connect(srvUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("   ✅ SRV connection SUCCESS\n");
    return mongoose.disconnect();
  })
  .catch((err) => {
    console.log("   ❌ SRV connection FAILED:", err.message, "\n");

    console.log("2. Testing with direct URI:");
    const directUri = process.env.MONGODB_URI_DIRECT;
    console.log("   URI:", directUri.replace(/:[^:]*@/, ":***@").substring(0, 100) + "...");

    return mongoose.connect(directUri, { serverSelectionTimeoutMS: 5000 })
      .then(() => {
        console.log("   ✅ Direct connection SUCCESS\n");
        return mongoose.disconnect();
      })
      .catch((err) => {
        console.log("   ❌ Direct connection FAILED:", err.message, "\n");
      });
  })
  .then(() => {
    console.log("=== TEST COMPLETE ===\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
