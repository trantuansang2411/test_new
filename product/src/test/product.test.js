const chai = require("chai");
const chaiHttp = require("chai-http");
const App = require("../app");
const jwt = require("jsonwebtoken");
const expect = chai.expect;
require("dotenv").config();

chai.use(chaiHttp);

describe("Products", function () {
  let app;
  let authToken;
  let createdProductId;

  before(async function () {
    process.env.NODE_ENV = 'test'; // ✅ Set test environment
    app = new App();
    await Promise.all([app.connectDB(), app.setupMessageBroker()]);

    // Authenticate with the auth microservice to get a token
    try {
      const authRes = await chai
        .request("http://localhost:3000")
        .post("/login")
        .send({ username: process.env.LOGIN_TEST_USER, password: process.env.LOGIN_TEST_PASSWORD });

      if (!authRes.body.token) {
        throw new Error("Auth response missing token");
      }
      authToken = authRes.body.token;
      console.log("Auth token:", authToken);
    } catch (error) {
      console.warn("⚠️ Auth service not running or invalid response. Creating local JWT token instead.");
      // 🪄 Fallback: Tạo JWT hợp lệ với cùng SECRET như Auth service
      authToken = jwt.sign(
        { username: "testuser", role: "user" },
        process.env.JWT_SECRET || "default_secret", // dùng secret thật nếu có
        { expiresIn: "1h" }
      );
      console.log("✅ Created fallback JWT token:", authToken);
    }

    app.start();
  });

  after(async function () {
    await app.disconnectDB();
    app.stop();
  });

  describe("POST /buy", function () {
    it("should create a new product with valid data", async () => {
      const product = {
        name: "Product 1",
        description: "Description of Product 1",
        price: 10,
      };
      const res = await chai
        .request(app.app)
        .post("/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(product);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("name", product.name);
      expect(res.body).to.have.property("description", product.description);
      expect(res.body).to.have.property("price", product.price);
      createdProductId = res.body._id; // Save for later tests
    });

    it("should return an error if name is missing", async () => {
      const product = {
        description: "Description of Product 1",
        price: 10.99,
      };
      const res = await chai
        .request(app.app)
        .post("/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(product);

      expect(res).to.have.status(400);
    });

    it("should return an error if price is missing", async () => {
      const product = {
        name: "Product without price",
        description: "Description of Product",
      };
      const res = await chai
        .request(app.app)
        .post("/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(product);

      expect(res).to.have.status(400);
    });

    it("should return unauthorized without token", async () => {
      const product = {
        name: "Product 2",
        description: "Description of Product 2",
        price: 20,
      };
      const res = await chai
        .request(app.app)
        .post("/")
        .send(product);

      expect(res).to.have.status(401);
    });

    it("should return unauthorized with invalid token", async () => {
      const product = {
        name: "Product 3",
        description: "Description of Product 3",
        price: 30,
      };
      const res = await chai
        .request(app.app)
        .post("/")
        .set("Authorization", "Bearer invalidtoken")
        .send(product);

      expect(res).to.have.status(401);
    });
  });

  describe("GET /", function () {
    it("should get all products", async () => {
      const res = await chai
        .request(app.app)
        .get("/")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an("array");
      expect(res.body.length).to.be.greaterThan(0);
      expect(res.body[0]).to.have.property("_id");
      expect(res.body[0]).to.have.property("name");
      expect(res.body[0]).to.have.property("price");
    });

    it("should return unauthorized without token", async () => {
      const res = await chai
        .request(app.app)
        .get("/");

      expect(res).to.have.status(401);
    });

    it("should return unauthorized with invalid token", async () => {
      const res = await chai
        .request(app.app)
        .get("/")
        .set("Authorization", "Bearer invalidtoken");

      expect(res).to.have.status(401);
    });
  });

  describe("POST /buy", function () {
    it("should create an order with valid products", async () => {
      const orderData = [
        {
          _id: createdProductId,
          quantity: 2
        }
      ];

      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("username");
      expect(res.body).to.have.property("products");
      expect(res.body.products).to.be.an("array");
    });

    it("should return error for empty products array", async () => {
      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send([]);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Invalid products data");
    });

    it("should return error for invalid products data", async () => {
      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send("invalid data");

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Invalid products data");
    });

    it("should return error for products without _id", async () => {
      const orderData = [
        {
          quantity: 2
        }
      ];

      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Each product must have an id and quantity");
    });

    it("should return error for products without quantity", async () => {
      const orderData = [
        {
          _id: createdProductId
        }
      ];

      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Each product must have an id and quantity");
    });

    it("should return error for quantity less than 1", async () => {
      const orderData = [
        {
          _id: createdProductId,
          quantity: 0
        }
      ];

      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message", "Product quantity must be > 0");
    });

    it("should return unauthorized without token", async () => {
      const orderData = [
        {
          _id: createdProductId,
          quantity: 1
        }
      ];

      const res = await chai
        .request(app.app)
        .post("/buy")
        .send(orderData);

      expect(res).to.have.status(401);
    });
  });

  // describe("GET /:id", function () {
  //   let testOrderId;

  //   it("should get order by valid ID", async function () {
  //     this.timeout(10000); // Increase timeout for order creation + retrieval

  //     // Step 1: Create a test order first
  //     const orderData = [
  //       {
  //         _id: createdProductId,
  //         quantity: 2
  //       }
  //     ];

  //     const createRes = await chai
  //       .request(app.app)
  //       .post("/buy")
  //       .set("Authorization", `Bearer ${authToken}`)
  //       .send(orderData);

  //     expect(createRes).to.have.status(201);
  //     testOrderId = createRes.body._id;
  //     console.log("Created test order with ID:", testOrderId);

  //     // Step 2: Get the order by ID
  //     const res = await chai
  //       .request(app.app)
  //       .get(`/${testOrderId}`)
  //       .set("Authorization", `Bearer ${authToken}`);

  //     expect(res).to.have.status(200);
  //     expect(res.body).to.have.property("_id");
  //     expect(res.body).to.have.property("user");
  //     expect(res.body).to.have.property("products");
  //     expect(res.body.products).to.be.an("array");
  //     expect(res.body).to.have.property("totalPrice");
  //     expect(res.body).to.have.property("status");
  //   });
  // });

});
