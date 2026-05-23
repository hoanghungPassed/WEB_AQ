const mongoose = require('mongoose');

const uri = "mongodb://hungnguyenames2003_db_user:d9pdZ01XEcKYEIwz@ac-4raxjpk-shard-00-00.uwjtsq1.mongodb.net:27017/web_aq_db?tls=true&authSource=admin";

console.log("Connecting...");
mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });
