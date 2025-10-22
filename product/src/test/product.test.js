const chai = require("chai");
const chaiHttp = require("chai-http");
const App = require("../app");
const jwt = require("jsonwebtoken");
const expect = chai.expect;
const Product = require("../models/productsModel");
require("dotenv").config();

chai.use(chaiHttp);

describe("Products", () => {
  let app;
  let authToken;
  let createdProductId;

  before(async () => {
    app = new App();
    await Promise.all([app.connectDB(), app.setupMessageBroker()]);

    // ✅ Thay vì gọi đến /login, ta tự tạo token hợp lệ:
    const fakeUser = { username: "test_user", role: "user" };
    authToken = jwt.sign(fakeUser, process.env.JWT_SECRET, { expiresIn: "1h" }); // 👈 Sinh token hợp lệ
    if (!authToken) {
      throw new Error("Missing TEST_AUTH_TOKEN in environment variables!");
    }

    console.log("Authtication token complete:", authToken);
    app.start();
  });

  after(async () => {
    await app.disconnectDB();
    app.stop();
  });

  describe("POST /buy", () => {
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

  describe("GET /", () => {
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

  describe("POST /buy", () => {
    it("should create an order with valid products", async () => {
      const product = await Product.create({
        name: "Test Product",
        price: 100,
        quantity: 10
      });

      const res = await chai
        .request(app.app)
        .post("/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          products: [{ _id: product._id, quantity: 2 }]
        });

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
});
