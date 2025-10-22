const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Dùng UUID do Product tạo làm _id
    _id: { type: String, required: true },
    username: { type: String, required: true },
    products: [
      {
        _id: { type: String, required: true },   // id sản phẩm (String)
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }
      }
    ],
    totalPrice: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
