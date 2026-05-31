const mongoose = require('mongoose');
const dns = require('dns');

// Google DNS override
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

// Custom lookup function that uses dns.resolve4 (respecting Google DNS) 
// instead of dns.lookup (which uses the broken OS resolver)
const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Resolve using Google DNS
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      // Fallback to system dns.lookup if resolve4 fails (e.g. for localhost/local services)
      dns.lookup(hostname, options, callback);
    } else {
      // Return the first resolved IPv4 address
      callback(null, addresses[0], 4);
    }
  });
};

const srvUri = "mongodb+srv://hungnguyenames2003_db_user:gkOWm9T49NPFzYIj@aq-media-cluster.uwjtsq1.mongodb.net/?appName=AQ-Media-Cluster";

async function test() {
  console.log("Testing SRV URI with Custom Lookup...");
  try {
    await mongoose.connect(srvUri, { 
      serverSelectionTimeoutMS: 5000,
      lookup: customLookup
    });
    console.log("✅ SRV Connection with Custom Lookup Successful!");
    await mongoose.disconnect();
  } catch (err) {
    console.log("❌ SRV Connection with Custom Lookup Failed:", err.message);
  }
}

test();
