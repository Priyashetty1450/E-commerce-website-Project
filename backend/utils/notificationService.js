/**
 * ============================================================
 * Notification Service
 * Handles Email & SMS notifications for orders
 * Enterprise-Level Implementation
 * ============================================================
 */

const nodemailer = require("nodemailer");
require("dotenv").config();

/* ============================================================
   CONFIGURATION VALIDATION
============================================================ */

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ EMAIL credentials are not properly configured in .env");
}

/* ============================================================
   EMAIL TRANSPORTER SETUP
============================================================ */

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/* Verify transporter connection */
transporter.verify((error) => {
    if (error) {
        console.error("❌ Email transporter configuration failed:", error.message);
    } else {
        console.log("✅ Email server is ready to send messages");
    }
});

/* ============================================================
   EMAIL CONFIG
============================================================ */

const EMAIL_CONFIG = {
    from: `"Shri Manjunatha Shamiyana Works & Events" <${process.env.EMAIL_USER}>`,
    companyName: "Shri Manjunatha Shamiyana Works & Events",
    supportEmail: process.env.EMAIL_USER,
};

/* ============================================================
   UTILITY FUNCTIONS
============================================================ */

function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function safeValue(value, fallback = "N/A") {
    return value ? value : fallback;
}

function generateBaseTemplate(content) {
    return `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            ${content}
            <hr />
            <p style="font-size:12px;color:#888;">
                © ${new Date().getFullYear()} ${EMAIL_CONFIG.companyName}
            </p>
        </div>
    `;
}

/* ============================================================
   GENERIC EMAIL SENDER
============================================================ */

async function sendEmail({ to, subject, htmlContent, textContent }) {
    try {
        const mailOptions = {
            from: EMAIL_CONFIG.from,
            to,
            subject,
            html: generateBaseTemplate(htmlContent),
            text: textContent,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("📧 Email sent:", info.messageId);

        return {
            success: true,
            messageId: info.messageId,
            sentAt: new Date(),
        };
    } catch (error) {
        console.error("❌ Email sending failed:", error.message);
        return { success: false, error: error.message };
    }
}

/* ============================================================
   ORDER CONFIRMATION EMAIL
============================================================ */

async function sendOrderConfirmationEmail(order) {
    const htmlContent = `
        <h2>Order Confirmed ✅</h2>
        <p>Dear ${safeValue(order.customer)},</p>

        <p>Thank you for your order. Your order has been successfully placed.</p>

        <h3>Order Details</h3>
        <ul>
            <li><strong>Order ID:</strong> ${safeValue(order.orderId)}</li>
            <li><strong>Total:</strong> ${formatCurrency(order.total)}</li>
            <li><strong>Payment Method:</strong> ${safeValue(order.paymentMethod)}</li>
            <li><strong>Estimated Delivery:</strong> ${safeValue(order.estimatedDelivery, "3-5 business days")}</li>
        </ul>

        <p>You can track your order using Order ID: <strong>${safeValue(order.orderId)}</strong></p>
    `;

    const textContent = `
        Order Confirmed

        Order ID: ${order.orderId}
        Total: ${order.total}
        Thank you for shopping with us.
    `;

    return await sendEmail({
        to: order.email,
        subject: `Order #${order.orderId} Confirmed`,
        htmlContent,
        textContent,
    });
}

/* ============================================================
   STATUS UPDATE EMAIL
============================================================ */

async function sendStatusUpdateEmail(order, status) {
    const htmlContent = `
        <h2>Order Status Update</h2>
        <p>Dear ${safeValue(order.customer)},</p>

        <p>Your order status has been updated to:</p>
        <h3>${status}</h3>

        <p><strong>Order ID:</strong> ${order.orderId}</p>
        ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ""}
    `;

    return await sendEmail({
        to: order.email,
        subject: `Order #${order.orderId} - ${status}`,
        htmlContent,
        textContent: `Order ${order.orderId} status updated to ${status}`,
    });
}

/* ============================================================
   REFUND EMAIL
============================================================ */

async function sendRefundConfirmationEmail(order, refundAmount) {
    const htmlContent = `
        <h2>Refund Processed</h2>
        <p>Dear ${safeValue(order.customer)},</p>

        <p>Your refund has been processed successfully.</p>

        <ul>
            <li><strong>Order ID:</strong> ${order.orderId}</li>
            <li><strong>Refund Amount:</strong> ${formatCurrency(refundAmount)}</li>
        </ul>

        <p>The amount will reflect within 5-7 business days.</p>
    `;

    return await sendEmail({
        to: order.email,
        subject: `Refund Processed - Order #${order.orderId}`,
        htmlContent,
        textContent: `Refund of ${refundAmount} processed for Order ${order.orderId}`,
    });
}

/* ============================================================
   SMS (SIMULATED - READY FOR TWILIO INTEGRATION)
============================================================ */

async function sendOrderConfirmationSMS(order) {
    if (!order.phone) {
        return { success: false, message: "Phone number not provided" };
    }

    console.log(`📱 SMS: Order ${order.orderId} confirmed for ${order.phone}`);
    return { success: true };
}

async function sendShippingNotificationSMS(order) {
    if (!order.phone) {
        return { success: false, message: "Phone number not provided" };
    }

    console.log(`📦 SMS: Order ${order.orderId} shipped`);
    return { success: true };
}

/* ============================================================
   DELIVERY NOTIFICATION
============================================================ */

async function sendDeliveryNotification(order) {
    const results = [];

    results.push(await sendStatusUpdateEmail(order, "Delivered"));

    if (order.phone) {
        results.push(await sendOrderConfirmationSMS(order));
    }

    return results;
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
    sendOrderConfirmationEmail,
    sendStatusUpdateEmail,
    sendRefundConfirmationEmail,
    sendOrderConfirmationSMS,
    sendShippingNotificationSMS,
    sendDeliveryNotification,
};