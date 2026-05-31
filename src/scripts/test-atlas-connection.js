const mongoose = require('mongoose');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, '');
    process.env[key] = value;
  }
}

const uri = process.env.MONGODB_URI;
console.log('MONGODB_URI:', uri);
console.log('DNS servers before:', dns.getServers());
if (dns.getServers().length === 1 && dns.getServers()[0] === '127.0.0.1') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}
console.log('DNS servers after:', dns.getServers());

dns.resolveSrv('_mongodb._tcp.aq-media-cluster.uwjtsq1.mongodb.net', (err, records) => {
  if (err) {
    console.error('resolveSrv error:', err);
  } else {
    console.log('resolveSrv records:', records);
  }

  mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  }).then(() => {
    console.log('Connected successfully');
    return mongoose.disconnect();
  }).catch((e) => {
    console.error('Mongoose connect error:', e);
    if (e.reason) console.error('Reason:', e.reason);
    if (e.errors) console.error('Errors:', e.errors);
    process.exit(1);
  });
});
