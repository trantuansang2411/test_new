const chai = require("chai");
const chaiHttp = require("chai-http");
const App = require("../app");
require("dotenv").config();


chai.use(chaiHttp);
const { expect } = chai;

describe("User Authentication", () => {
  let app;
  let authToken;

  before(async () => {
    this.timeout(20000);
    app = new App();
    console.log("Connecting to MongoDB...");
    await app.connectDB();
    app.start();
  });

  after(async () => {
    console.log("Starting cleanup...");
    await app.authController.authService.deleteTestUsers();
    console.log("Deleted test users.");
    await app.disconnectDB();
    console.log("Disconnected DB.");
    app.stop();
    console.log("Stopped server.");
  });

  describe("POST /register", () => {
    it("should register a new user", async () => {
      const res = await chai
        .request(app.app)
        .post("/register")
        .send({ username: "testuser", password: "password" });

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("username", "testuser");
    });

    it("should return an error if the username is already taken", async () => {
      const res = await chai
        .request(app.app)
        .post("/register")
        .send({ username: "testuser", password: "password" });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Username already taken");
    });

    it("should return an error if username is missing", async () => {
      const res = await chai
        .request(app.app)
        .post("/register")
        .send({ password: "password" });

      expect(res).to.have.status(400);
    });

    it("should return an error if password is missing", async () => {
      const res = await chai
        .request(app.app)
        .post("/register")
        .send({ username: "testuser2" });

      expect(res).to.have.status(400);
    });
  });

  describe("POST /login", () => {
    it("should return a JWT token for a valid user", async () => {
      const res = await chai
        .request(app.app)
        .post("/login")
        .send({ username: "testuser", password: "password" });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("token");
      authToken = res.body.token; // Save token for later tests
    });

    it("should return an error for an invalid user", async () => {
      const res = await chai
        .request(app.app)
        .post("/login")
        .send({ username: "invaliduser", password: "password" });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Invalid username or password");
    });

    it("should return an error for an incorrect password", async () => {
      const res = await chai
        .request(app.app)
        .post("/login")
        .send({ username: "testuser", password: "wrongpassword" });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Invalid username or password");
    });

    it("should return an error if username is missing", async () => {
      const res = await chai
        .request(app.app)
        .post("/login")
        .send({ password: "password" });

      expect(res).to.have.status(400);
    });

    it("should return an error if password is missing", async () => {
      const res = await chai
        .request(app.app)
        .post("/login")
        .send({ username: "testuser" });

      expect(res).to.have.status(400);
    });
  });

  describe("GET /dashboard", () => {
    it("should access dashboard with valid token", async () => {
      const res = await chai
        .request(app.app)
        .get("/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property("message", "Welcome to dashboard");
    });

    it("should return unauthorized without token", async () => {
      const res = await chai
        .request(app.app)
        .get("/dashboard");

      expect(res).to.have.status(401);
    });

    it("should return unauthorized with invalid token", async () => {
      const res = await chai
        .request(app.app)
        .get("/dashboard")
        .set("Authorization", "Bearer invalidtoken");

      expect(res).to.have.status(401);
    });
  });
});
