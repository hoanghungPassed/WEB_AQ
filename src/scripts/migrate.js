const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
const envLocalPath = path.join(__dirname, "../../.env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("🚀 Starting database migration and index creation...");
  console.log(`📡 Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Successfully connected to MongoDB.");
    
    const db = mongoose.connection.db;
    
    // Define the indexes we want to ensure
    const indexesToCreate = [
      {
        collection: "users",
        spec: { username: 1 },
        options: { unique: true }
      },
      {
        collection: "users",
        spec: { email: 1 },
        options: { unique: true, sparse: true }
      },
      {
        collection: "users",
        spec: { role: 1 },
        options: {}
      },
      {
        collection: "users",
        spec: { isOnline: 1 },
        options: {}
      },
      {
        collection: "attendances",
        spec: { userId: 1, date: 1 },
        options: { unique: true }
      },
      {
        collection: "attendances",
        spec: { date: 1 },
        options: {}
      },
      {
        collection: "attendances",
        spec: { userId: 1 },
        options: {}
      },
      {
        collection: "tasks",
        spec: { assigneeId: 1, status: 1 },
        options: {}
      },
      {
        collection: "tasks",
        spec: { deadline: 1 },
        options: {}
      },
      {
        collection: "tasks",
        spec: { status: 1 },
        options: {}
      },
      {
        collection: "tasks",
        spec: { assigneeId: 1 },
        options: {}
      },
      {
        collection: "fines",
        spec: { userId: 1, createdAt: -1 },
        options: {}
      },
      {
        collection: "fines",
        spec: { status: 1 },
        options: {}
      },
      {
        collection: "fines",
        spec: { userId: 1 },
        options: {}
      },
      {
        collection: "fines",
        spec: { createdAt: -1 },
        options: {}
      }
    ];

    for (const index of indexesToCreate) {
      const colName = index.collection;
      console.log(`\n📦 Collection: [${colName}]`);
      console.log(`👉 Index spec: ${JSON.stringify(index.spec)} with options: ${JSON.stringify(index.options)}`);

      const collection = db.collection(colName);

      // Handle cleaning up duplicate entries BEFORE creating unique indexes to avoid E11000 errors!
      if (index.options.unique) {
        if (colName === "users" && index.spec.username) {
          console.log("🔍 Checking for duplicate usernames...");
          const duplicates = await collection.aggregate([
            { $group: { _id: "$username", count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } }
          ]).toArray();

          if (duplicates.length > 0) {
            console.log(`⚠️ Found ${duplicates.length} duplicate username(s). Retaining the first document and cleaning up others...`);
            for (const dup of duplicates) {
              const keepId = dup.ids[0];
              const deleteIds = dup.ids.slice(1);
              console.log(`   - Username: "${dup._id}". Keeping ID: ${keepId}. Deleting IDs: ${deleteIds.join(", ")}`);
              await collection.deleteMany({ _id: { $in: deleteIds } });
            }
          } else {
            console.log("   No duplicate usernames found.");
          }
        }

        if (colName === "users" && index.spec.email) {
          console.log("🔍 Checking for duplicate emails (excluding empty strings/nulls due to sparse option)...");
          const duplicates = await collection.aggregate([
            { $match: { email: { $exists: true, $ne: "", $ne: null } } },
            { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } }
          ]).toArray();

          if (duplicates.length > 0) {
            console.log(`⚠️ Found ${duplicates.length} duplicate email(s). Retaining the first document and cleaning up others...`);
            for (const dup of duplicates) {
              const keepId = dup.ids[0];
              const deleteIds = dup.ids.slice(1);
              console.log(`   - Email: "${dup._id}". Keeping ID: ${keepId}. Deleting IDs: ${deleteIds.join(", ")}`);
              await collection.deleteMany({ _id: { $in: deleteIds } });
            }
          } else {
            console.log("   No duplicate non-empty emails found.");
          }
        }

        if (colName === "attendances" && index.spec.userId && index.spec.date) {
          console.log("🔍 Checking for duplicate daily attendance records per user...");
          const duplicates = await collection.aggregate([
            { $group: { _id: { userId: "$userId", date: "$date" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } }
          ]).toArray();

          if (duplicates.length > 0) {
            console.log(`⚠️ Found ${duplicates.length} duplicate attendance records. Retaining the first document and cleaning up others...`);
            for (const dup of duplicates) {
              const keepId = dup.ids[0];
              const deleteIds = dup.ids.slice(1);
              console.log(`   - User: ${dup._id.userId}, Date: ${dup._id.date}. Keeping ID: ${keepId}. Deleting IDs: ${deleteIds.join(", ")}`);
              await collection.deleteMany({ _id: { $in: deleteIds } });
            }
          } else {
            console.log("   No duplicate attendance records found.");
          }
        }
      }

      try {
        const result = await collection.createIndex(index.spec, index.options);
        console.log(`✅ Index created successfully: ${result}`);
      } catch (err) {
        console.error(`❌ Failed to create index on ${colName}:`, err.message);
        
        // If unique index failed on email due to empty strings ("") being treated as duplicate value
        if (colName === "users" && index.spec.email && err.code === 11000) {
          console.log("💡 Tip: Mongoose sparse unique index on email can fail if multiple documents have empty strings. Let's fix this by setting duplicate empty email fields to null/undefined or deleting empty email fields...");
          
          // Let's unset the empty string emails so the sparse index can be created
          const updateResult = await collection.updateMany({ email: "" }, { $unset: { email: "" } });
          console.log(`   Unset empty email fields for ${updateResult.modifiedCount} users.`);
          
          // Retry index creation
          const retryResult = await collection.createIndex(index.spec, index.options);
          console.log(`   ✅ Retry index created successfully: ${retryResult}`);
        } else {
          throw err;
        }
      }
    }

    console.log("\n⭐️ Database migration completed successfully!");
    
    // Print all indexes for each collection to verify
    console.log("\n🔍 Verification of Database Indexes:");
    const collections = ["users", "attendances", "tasks", "fines"];
    for (const col of collections) {
      const indexes = await db.collection(col).indexes();
      console.log(`\nIndexes for collection [${col}]:`);
      indexes.forEach(idx => {
        console.log(`- ${idx.name}: ${JSON.stringify(idx.key)} (Unique: ${!!idx.unique}, Sparse: ${!!idx.sparse})`);
      });
    }

  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB.");
  }
}

migrate();
