/**
 * Notification Service
 * Handles email and SMS notifications for orders
 */

// Email configuration (configure with your SMTP settings)
const EMAIL_CONFIG = {
    from: 'noreply@shrimanjunatha.com',
    subject: 'Order Confirmation - Shri Manjunatha Shamiyana'
};

// SMS configuration (configure with your SMS provider)
const SMS_CONFIG = {
    senderId: 'SHRIAN',
    // In production, integrate with providers like Twilio, Nexmo, etc.
};

/**
 * Send order confirmation email
 * @param {object} order - Order details
 * @returns {Promise<object>} - Email send result
 */
async function sendOrderConfirmationEmail(order) {
    // In production, use nodemailer or similar
    // For now, simulate email sending
    console.log(`[EMAIL] Sending order confirmation for ${order.orderId}`);
    console.log(`[EMAIL] To: ${order.email}`);
    console.log(`[EMAIL] Subject: Order #${order.orderId} Confirmed`);
    
    const emailContent = `
        Dear ${order.customer},

        Thank you for your order! Your order has been successfully placed.

        Order Details:
        - Order ID: ${order.orderId}
        - Order Total: ₹${order.total}
        - Payment Method: ${order.paymentMethod || 'Pending'}
        - Shipping Address: ${formatAddress(order.shippingAddress)}

        Estimated Delivery: ${order.estimatedDelivery || '3-5 business days'}

        You can track your order using the Order ID: ${order.orderId}

        Thank you for shopping with us!

        Best regards,
        Shri Manjunatha Shamiyana Works & Events
    `;

    console.log(`[EMAIL] Content: ${emailContent}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        message: 'Email sent successfully',
        orderId: order.orderId,
        email: order.email,
        sentAt: new Date()
    };
}

/**
 * Send order status update email
 * @param {object} order - Order details
 * @param {string} status - New status
 * @returns {Promise<object>} - Email send result
 */
async function sendStatusUpdateEmail(order, status) {
    console.log(`[EMAIL] Sending status update for ${order.orderId}`);
    
    const statusMessages = {
        'Order Packed': 'Your order has been packed and is ready for shipment.',
        'Order Shipped': 'Your order has been shipped!',
        'Order Out for Delivery': 'Your order is out for delivery.',
        'Delivered': 'Your order has been delivered successfully!'
    };

    const emailContent = `
        Dear ${order.customer},

        Your order status has been updated.

        Order ID: ${order.orderId}
        New Status: ${status}
        ${statusMessages[status] || ''}

        ${order.trackingNumber ? `Tracking Number: ${order.trackingNumber}` : ''}

        Thank you for shopping with us!

        Best regards,
        Shri Manjunatha Shamiyana Works & Events
    `;

    console.log(`[EMAIL] Status Update: ${emailContent}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        message: 'Status update email sent',
        orderId: order.orderId,
        status: status,
        sentAt: new Date()
    };
}

/**
 * Send order confirmation SMS
 * @param {object} order - Order details
 * @returns {Promise<object>} - SMS send result
 */
async function sendOrderConfirmationSMS(order) {
    if (!order.phone) {
        return { success: false, message: 'Phone number not provided' };
    }

    console.log(`[SMS] Sending order confirmation to ${order.phone}`);

    const smsContent = ` Shri Manjunatha: Order ${order.orderId} confirmed! Total: ₹${order.total}. Thank you for your order!`;

    console.log(`[SMS] Content: ${smsContent}`);

    // In production, integrate with SMS provider
    // const response = await twilioClient.messages.create({
    //     body: smsContent,
    //     from: SMS_CONFIG.senderId,
    //     to: order.phone
    // });

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        message: 'SMS sent successfully',
        orderId: order.orderId,
        phone: order.phone,
        sentAt: new Date()
    };
}

/**
 * Send shipping notification SMS
 * @param {object} order - Order details
 * @returns {Promise<object>} - SMS send result
 */
async function sendShippingNotificationSMS(order) {
    if (!order.phone) {
        return { success: false, message: 'Phone number not provided' };
    }

    console.log(`[SMS] Sending shipping notification to ${order.phone}`);

    const smsContent = ` Shri Manjunatha: Your order ${order.orderId} has been shipped! Track: ${order.trackingNumber || 'N/A'}`;

    console.log(`[SMS] Content: ${smsContent}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        message: 'Shipping notification SMS sent',
        orderId: order.orderId,
        phone: order.phone,
        sentAt: new Date()
    };
}

/**
 * Send delivery notification
 * @param {object} order - Order details
 * @returns {Promise<object>} - Notification result
 */
async function sendDeliveryNotification(order) {
    const results = [];

    // Send email
    const emailResult = await sendStatusUpdateEmail(order, 'Delivered');
    results.push(emailResult);

    // Send SMS
    if (order.phone) {
        const smsContent = ` Shri Manjunatha: Your order ${order.orderId} has been delivered! Thank you for shopping with us!`;
        const smsResult = await sendOrderConfirmationSMS(order);
        results.push(smsResult);
    }

    return results;
}

/**
 * Format address for display
 * @param {object} address - Address object
 * @returns {string} - Formatted address
 */
function formatAddress(address) {
    if (!address) return 'Not provided';
    
    const parts = [
        address.street,
        address.landmark,
        address.city,
        address.state,
        address.zipCode,
        address.country
    ].filter(part => part);

    return parts.join(', ');
}

/**
 * Send refund confirmation email
 * @param {object} order - Order details
 * @param {number} refundAmount - Refund amount
 * @returns {Promise<object>} - Email send result
 */
async function sendRefundConfirmationEmail(order, refundAmount) {
    console.log(`[EMAIL] Sending refund confirmation for ${order.orderId}`);

    const emailContent = `
        Dear ${order.customer},

        Your refund has been processed successfully.

        Order ID: ${order.orderId}
        Refund Amount: ₹${refundAmount}
        Refund Method: Original payment method

        The refund should reflect in your account within 5-7 business days.

        If you have any questions, please contact our support team.

        Thank you!

        Best regards,
        Shri Manjunatha Shamiyana Works & Events
    `;

    console.log(`[EMAIL] Refund Content: ${emailContent}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        message: 'Refund confirmation email sent',
        orderId: order.orderId,
        refundAmount: refundAmount,
        sentAt: new Date()
    };
}

module.exports = {
    sendOrderConfirmationEmail,
    sendStatusUpdateEmail,
    sendOrderConfirmationSMS,
    sendShippingNotificationSMS,
    sendDeliveryNotification,
    sendRefundConfirmationEmail,
    formatAddress,
    EMAIL_CONFIG,
    SMS_CONFIG
};
