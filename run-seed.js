const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

// 1. Load Environment Variables from .env.local
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
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
    process.env[key] = value;
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local!");
  process.exit(1);
}

// 2. Define User Schema locally to avoid imports
const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: String,
  password: { type: String, required: true },
  role: String,
  status: { type: String, default: "ACTIVE" },
  isOnline: { type: Boolean, default: false },
  lastActive: Date
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Database Connected Successfully!");

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log(`ℹ️ Database already has ${userCount} user(s). No seeding needed.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("Hashing password '123456'...");
  const hashedPassword = await bcrypt.hash("123456", 10);

  const defaultUsers = [
    { name: "Admin", username: "01", email: "admin@aqmedia.com", password: hashedPassword, role: "01", status: "ACTIVE" },
    { name: "QL Công Việc", username: "02", email: "qlcv@aqmedia.com", password: hashedPassword, role: "02", status: "ACTIVE" },
    { name: "QL Nhân Sự", username: "03", email: "qlns@aqmedia.com", password: hashedPassword, role: "03", status: "ACTIVE" },
    { name: "Nhân Viên", username: "04", email: "nv@aqmedia.com", password: hashedPassword, role: "04", status: "ACTIVE" },
  ];

  console.log("Creating default user accounts...");
  await User.insertMany(defaultUsers);
  console.log("✅ Default users created successfully!");

  await mongoose.disconnect();
  console.log("Disconnected from database.");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
