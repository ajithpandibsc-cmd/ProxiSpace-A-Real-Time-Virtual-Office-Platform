const mongoose = require("mongoose");
let isConnected = false;

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/proxispeak";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("✅ MongoDB connected:", uri);
    isConnected = true;
    return true;
  } catch (err) {
    mongoose.set("bufferCommands", false);
    isConnected = false;
    console.warn("⚠️  MongoDB unavailable — running with in-memory persistence:", err.message);
    console.warn("   Start MongoDB to enable disk-backed persistence.");
    return false;
  }
}

function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDbConnected };

