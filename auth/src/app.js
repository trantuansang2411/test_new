const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const AuthRoutes = require("./routes/authRoutes");
const AuthController = require("./controllers/authController");

class App {
  constructor() {
    this.app = express();
    this.authController = new AuthController();
    this.setMiddlewares();
    this.setRoutes();
  }

  async connectDB() {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      bufferMaxEntries: 0,
      bufferCommands: false,
    });
    console.log("MongoDB connected");
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }

  setMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
  }

  setRoutes() {
    this.app.use("/", AuthRoutes);
  }

  start() {
    this.connectDB().then(() => {
      this.server = this.app.listen(3000, () => console.log("Server started on port 3000"));
    }).catch(err => {
      console.error("Failed to connect to MongoDB:", err);
      process.exit(1);
    });
  }

  async stop() {
    await mongoose.disconnect();
    this.server.close();
    console.log("Server stopped");
  }
}

module.exports = App;
