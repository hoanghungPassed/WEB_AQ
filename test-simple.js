const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

const srvUri = "mongodb+srv://hungnguyenames2003_db_user:gkOWm9T49NPFzYIj@aq-media-cluster.uwjtsq1.mongodb.net/?appName=AQ-Media-Cluster";

mongoose.connect(srvUri)
  .then(() => {
    console.log("✅ Simple Connection Successful!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Simple Connection Failed:", err);
    process.exit(1);
  });
