/**
 * Payment Gateway Utility
 * Simulates payment gateway integration for checkout
 */

// Payment status constants
const PAYMENT_STATUS = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Payment methods
const PAYMENT_METHODS = {
    CARD: 'card',
    UPI: 'upi',
    NETBANKING: 'netbanking',
    WALLET: 'wallet',
    COD: 'cash_on_delivery'
};

/**
 * Simulates initiating a payment with a payment gateway
 * @param {object} paymentData - Payment details
 * @returns {Promise<object>} - Payment initialization response
 */
async function initiatePayment(paymentData) {
    const { orderId, amount, customerEmail, customerPhone, paymentMethod } = paymentData;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a mock payment ID
    const paymentId = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // In a real implementation, this would return a payment gateway URL
    // For simulation, we return a mock response
    return {
        success: true,
        paymentId: paymentId,
        orderId: orderId,
        amount: amount,
        status: PAYMENT_STATUS.PENDING,
        paymentMethod: paymentMethod || PAYMENT_METHODS.CARD,
        message: 'Payment initiated successfully',
        // In real implementation, this would be the gateway redirect URL
        redirectUrl: `/payment-process.html?paymentId=${paymentId}&orderId=${orderId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    };
}

/**
 * Simulates processing a payment
 * @param {string} paymentId - The payment ID
 * @param {object} paymentDetails - Payment details (card info, etc.)
 * @returns {Promise<object>} - Payment processing response
 */
async function processPayment(paymentId, paymentDetails) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate payment processing
    // In production, this would call the actual payment gateway API
    
    // For simulation, we'll randomly succeed or fail (90% success rate)
    // In real implementation, this would depend on actual payment gateway response
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
        return {
            success: true,
            paymentId: paymentId,
            status: PAYMENT_STATUS.SUCCESS,
            transactionId: 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            message: 'Payment successful',
            processedAt: new Date()
        };
    } else {
        return {
            success: false,
            paymentId: paymentId,
            status: PAYMENT_STATUS.FAILED,
            errorCode: 'PAYMENT_FAILED',
            message: 'Payment failed. Please try again or use a different payment method.',
            processedAt: new Date()
        };
    }
}

/**
 * Simulates a successful payment (for testing)
 * @param {string} paymentId - The payment ID
 * @returns {Promise<object>} - Payment success response
 */
async function simulateSuccess(paymentId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        success: true,
        paymentId: paymentId,
        status: PAYMENT_STATUS.SUCCESS,
        transactionId: 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        message: 'Payment successful',
        processedAt: new Date()
    };
}

/**
 * Simulates a failed payment (for testing)
 * @param {string} paymentId - The payment ID
 * @param {string} reason - Failure reason
 * @returns {Promise<object>} - Payment failure response
 */
async function simulateFailure(paymentId, reason = 'Payment declined') {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        success: false,
        paymentId: paymentId,
        status: PAYMENT_STATUS.FAILED,
        errorCode: 'PAYMENT_FAILED',
        message: reason,
        processedAt: new Date()
    };
}

/**
 * Verify payment status
 * @param {string} paymentId - The payment ID
 * @returns {Promise<object>} - Payment status
 */
async function verifyPayment(paymentId) {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In real implementation, this would check with payment gateway
    return {
        paymentId: paymentId,
        status: PAYMENT_STATUS.SUCCESS,
        verified: true
    };
}

/**
 * Process payment callback from gateway
 * @param {object} callbackData - Callback data from payment gateway
 * @returns {object} - Processed callback result
 */
function processCallback(callbackData) {
    const { paymentId, orderId, status, transactionId, amount } = callbackData;
    
    // Validate callback data
    if (!paymentId || !orderId || !status) {
        return {
            success: false,
            message: 'Invalid callback data'
        };
    }
    
    // Process based on status
    switch (status.toLowerCase()) {
        case 'success':
            return {
                success: true,
                paymentId: paymentId,
                orderId: orderId,
                status: PAYMENT_STATUS.SUCCESS,
                transactionId: transactionId,
                message: 'Payment confirmed'
            };
        case 'failed':
            return {
                success: false,
                paymentId: paymentId,
                orderId: orderId,
                status: PAYMENT_STATUS.FAILED,
                message: 'Payment failed'
            };
        case 'cancelled':
            return {
                success: false,
                paymentId: paymentId,
                orderId: orderId,
                status: PAYMENT_STATUS.CANCELLED,
                message: 'Payment cancelled by user'
            };
        default:
            return {
                success: false,
                paymentId: paymentId,
                orderId: orderId,
                status: status,
                message: 'Unknown payment status'
            };
    }
}

/**
 * Generate payment receipt
 * @param {object} paymentInfo - Payment information
 * @returns {object} - Receipt data
 */
function generateReceipt(paymentInfo) {
    const { orderId, paymentId, transactionId, amount, customerEmail, paymentMethod } = paymentInfo;
    
    return {
        receiptId: 'RCP-' + Date.now(),
        orderId: orderId,
        paymentId: paymentId,
        transactionId: transactionId,
        amount: amount,
        paymentMethod: paymentMethod,
        customerEmail: customerEmail,
        paidAt: new Date(),
        valid: true
    };
}

module.exports = {
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    initiatePayment,
    processPayment,
    simulateSuccess,
    simulateFailure,
    verifyPayment,
    processCallback,
    generateReceipt
};
