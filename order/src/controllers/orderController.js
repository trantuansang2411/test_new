const OrderService = require("../services/orderService");
const orderService = require("../services/orderService");

class OrderController {
  constructor() {
    this.orderService = new (require("../services/orderService"))();
    this.getOrderById = this.getOrderById.bind(this);
    this.getAllOrders = this.getAllOrders.bind(this);
  }

  async getOrderById(req, res) {
    try {
      const order = await this.orderService.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      return res.status(200).json(order);
    } catch (err) {
      console.error("Error fetching order:", err.message);
      return res.status(400).json({ message: err.message });
    }
  }

  async getAllOrders(req, res) {
    try {
      const orders = await this.orderService.getAllOrders();
      return res.status(200).json(orders);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = OrderController;