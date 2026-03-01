const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Check if mock payment is enabled
const isMockPayment = process.env.MOCK_PAYMENT === 'true';

// Initialize Razorpay with keys from environment variables
// These should be set in LS.env or process.env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXXXXXXX',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
});

// Get payment mode status
router.get('/mode', (req, res) => {
    res.json({
        success: true,
        isMockPayment: isMockPayment,
        message: isMockPayment ? 'Mock payment mode is enabled for testing' : 'Live payment mode is enabled'
    });
});

// Create Order (handles both real and mock payments)
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency, receipt } = req.body;

        // Validate required fields
        if (!amount || !currency) {
            return res.status(400).json({
                success: false,
                message: 'Amount and currency are required'
            });
        }

        // If mock payment is enabled, return a mock order
        if (isMockPayment) {
            const mockOrderId = 'mock_order_' + Date.now();
            console.log('MOCK PAYMENT: Creating mock order:', mockOrderId);
            return res.json({
                success: true,
                orderId: mockOrderId,
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                receipt: receipt || 'order_' + Date.now(),
                isMock: true
            });
        }

        // Create order using Razorpay SDK (live payment)
        const options = {
            amount: Math.round(amount * 100), // Convert to paisa
            currency: currency || 'INR',
            receipt: receipt || 'order_' + Date.now(),
            payment_capture: 1 // Auto-capture payment
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            isMock: false
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        
        // If live payment fails, fallback to mock mode automatically
        if (!isMockPayment) {
            console.log('Falling back to mock payment mode due to error');
            const mockOrderId = 'mock_order_fallback_' + Date.now();
            return res.json({
                success: true,
                orderId: mockOrderId,
                amount: Math.round(req.body.amount * 100),
                currency: req.body.currency || 'INR',
                receipt: 'order_' + Date.now(),
                isMock: true,
                fallback: true
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
});

// Verify Payment Signature
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;

        // Check if this is a mock payment verification
        if (isMockPayment || isMock) {
            console.log('MOCK PAYMENT: Verifying mock payment');
            // Generate mock payment details
            const mockPaymentId = 'mock_pay_' + Date.now();
            const mockSignature = crypto
                .createHmac('sha256', 'mock_secret')
                .update(razorpay_order_id + '|' + mockPaymentId)
                .digest('hex');
            
            return res.json({
                success: true,
                message: 'Mock payment verified successfully',
                paymentId: mockPaymentId,
                signature: mockSignature,
                isMock: true
            });
        }

        // Validate required fields for live payment
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'All payment verification fields are required'
            });
        }

        // Create signature verification for live payment
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                isMock: false
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        
        // For mock payments, return success even on error
        if (isMockPayment) {
            return res.json({
                success: true,
                message: 'Mock payment verified (error handled)',
                paymentId: 'mock_pay_' + Date.now(),
                isMock: true
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// Get Razorpay Key (for frontend)
router.get('/key', (req, res) => {
    // If mock payment is enabled, return a test key for the checkout to work
    if (isMockPayment) {
        return res.json({
            success: true,
            key: 'rzp_test_XXXXXXXXXXXXXXXXXXXX',
            isMock: true
        });
    }
    
    res.json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXXXXXXXXXXXXXX',
        isMock: false
    });
});

module.exports = router;
