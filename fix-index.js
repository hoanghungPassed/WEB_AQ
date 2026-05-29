const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://hungnguyenames2003_db_user:d9pdZ01XEcKYEIwz@aq-media-cluster.uwjtsq1.mongodb.net/web_aq_db?retryWrites=true&w=majority&appName=AQ-Media-Cluster');
  console.log('Connected to DB');
  try {
    await mongoose.connection.collection('users').dropIndex('email_1');
    console.log('Dropped email_1 index');
  } catch (err) {
    console.log('Index might not exist or other error:', err.message);
  }
  await mongoose.disconnect();
}
fix();
