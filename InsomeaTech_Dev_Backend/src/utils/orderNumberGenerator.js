const Order = require('../models/order');

async function generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get next sequence number for current month by querying existing orders
    // This ensures uniqueness across all orders
    const allOrders = await Order.findAll();
    
    // Filter orders for current month and year
    const currentMonthOrders = allOrders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.getFullYear() === year && 
               String(orderDate.getMonth() + 1).padStart(2, '0') === month;
    });
    
    // Find the highest sequence number in current month
    let maxSequence = 0;
    currentMonthOrders.forEach(order => {
        const orderNumber = order.order_number;
        if (orderNumber.startsWith(`ORD-${year}-${month}-`)) {
            const sequenceStr = orderNumber.replace(`ORD-${year}-${month}-`, '');
            const sequence = parseInt(sequenceStr);
            if (!isNaN(sequence) && sequence > maxSequence) {
                maxSequence = sequence;
            }
        }
    });
    
    const nextSequence = maxSequence + 1;
    const nextOrderNumber = `ORD-${year}-${month}-${String(nextSequence).padStart(3, '0')}`;
    
    return nextOrderNumber;
}

module.exports = {
    generateOrderNumber
};