const Product = require("../models/productsModel");

class ProductsRepository {
  async create(product) {
    return await Product.create(product);
  }

  async findById(productId) {
    return await Product.findById(productId).lean(); // Sử dụng .lean() để trả về Plain Object
  }

  async findByName(name) {
    return await Product.findOne({ name }).lean();
  }

  async findByIds(ids) {
    console.log("Finding products with IDs:", ids);
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: objectIds } }).lean();
    return products; // ✅ Đảm bảo return array
  }

  async findAll() {
    return await Product.find().lean(); // Sử dụng .lean() để trả về Plain Object
  }
}

module.exports = ProductsRepository;
