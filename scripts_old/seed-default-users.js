const dns = require('dns');
dns.setServers(['8.8.8.8','8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split(/\r?\n/).reduce((acc, line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return acc;
  const idx = trimmed.indexOf('=');
  if (idx === -1) return acc;
  let key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  acc[key] = value;
  return acc;
}, {});

const MONGODB_URI = env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in .env.local');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: String,
  password: String,
  role: String,
  status: String,
  isOnline: Boolean,
  taskCount: Number,
  kpiProgress: Number,
  avatar: String,
  lastActive: Date,
  birthYear: String,
  phone: String,
  address: String,
  checkInTime: String,
  checkOutTime: String,
  offWorkTime: String,
  deletedAt: Date,
  twoFAEnabled: Boolean,
  twoFASecret: String,
  backupCodes: [String],
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    const count = await User.countDocuments();
    console.log('User count in DB:', count);

    if (count === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const users = [
        { name: 'Admin', username: '01', email: 'admin@aqmedia.com', password: passwordHash, role: '01', status: 'ACTIVE' },
        { name: 'QL Công Việc', username: '02', email: 'qlcv@aqmedia.com', password: passwordHash, role: '02', status: 'ACTIVE' },
        { name: 'QL Nhân Sự', username: '03', email: 'qlns@aqmedia.com', password: passwordHash, role: '03', status: 'ACTIVE' },
        { name: 'Nhân Viên', username: '04', email: 'nv@aqmedia.com', password: passwordHash, role: '04', status: 'ACTIVE' },
      ];
      await User.insertMany(users);
      console.log('Seeded default users with password 123456');
    } else {
      console.log('DB already contains users; no default users were seeded.');
    }
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
