const Order = require('../models/order');

class OrderRepository {
    async create(orderData) {
        const order = new Order(orderData);
        return await order.save();
    }
    // Thêm method mới: tìm theo orderMapId
    async findByOrderMapId(orderMapId) {
        try {
            return await Order.findOne({ orderMapId: orderMapId });
        } catch (error) {
            console.error("Error finding order by orderMapId:", error.message);
            throw error;
        }
    }
    async findAll() {
        return await Order.find();
    }
}

module.exports = new OrderRepository();
