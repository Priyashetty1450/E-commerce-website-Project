/**
 * Shipping Calculator Utility
 * Calculates shipping charges based on various rules
 */

// Default shipping configuration
const SHIPPING_CONFIG = {
    // Free shipping threshold (order total above this is free)
    freeShippingThreshold: 500,
    
    // Base shipping charges
    baseCharge: 50,
    
    // Per-kg additional charge
    perKgCharge: 10,
    
    // Shipping rates by zone (multiplier)
    zoneRates: {
        'local': 1,      // Same city
        'intra-state': 1.2,  // Same state
        'inter-state': 1.5,  // Different state
        'remote': 2      // Remote areas
    },
    
    // Estimated delivery days by zone
    deliveryDays: {
        'local': 1,
        'intra-state': 2,
        'inter-state': 4,
        'remote': 7
    }
};

/**
 * Calculate shipping charges based on order details
 * @param {number} subtotal - The subtotal amount
 * @param {number} weight - Total weight in kg (optional, defaults to 1)
 * @param {string} zone - Shipping zone (local, intra-state, inter-state, remote)
 * @returns {object} - Shipping breakdown
 */
function calculateShipping(subtotal, weight = 1, zone = 'local') {
    // Check if order qualifies for free shipping
    const isFreeShipping = subtotal >= SHIPPING_CONFIG.freeShippingThreshold;
    
    // Get zone multiplier
    const zoneRate = SHIPPING_CONFIG.zoneRates[zone] || SHIPPING_CONFIG.zoneRates['inter-state'];
    
    // Calculate shipping charge
    let shippingCharge = 0;
    
    if (!isFreeShipping) {
        const baseCharge = SHIPPING_CONFIG.baseCharge * zoneRate;
        const weightCharge = (weight > 1) ? (weight - 1) * SHIPPING_CONFIG.perKgCharge * zoneRate : 0;
        shippingCharge = Math.round((baseCharge + weightCharge) * 100) / 100;
    }
    
    // Get estimated delivery days
    const deliveryDays = SHIPPING_CONFIG.deliveryDays[zone] || SHIPPING_CONFIG.deliveryDays['inter-state'];
    
    return {
        subtotal: subtotal,
        weight: weight,
        zone: zone,
        isFreeShipping: isFreeShipping,
        shippingCharge: shippingCharge,
        freeShippingThreshold: SHIPPING_CONFIG.freeShippingThreshold,
        deliveryDays: deliveryDays,
        deliveryEstimate: `${deliveryDays}-${deliveryDays + 2} days`
    };
}

/**
 * Calculate shipping for inter-state orders (default)
 * @param {number} subtotal - The subtotal amount
 * @param {number} weight - Total weight in kg
 * @returns {object} - Shipping breakdown
 */
function calculateInterStateShipping(subtotal, weight = 1) {
    return calculateShipping(subtotal, weight, 'inter-state');
}

/**
 * Calculate shipping for local deliveries
 * @param {number} subtotal - The subtotal amount
 * @param {number} weight - Total weight in kg
 * @returns {object} - Shipping breakdown
 */
function calculateLocalShipping(subtotal, weight = 1) {
    return calculateShipping(subtotal, weight, 'local');
}

/**
 * Determine zone based on shipping address
 * @param {string} state - State code
 * @param {string} userState - User's state code (for intra-state detection)
 * @returns {string} - Zone type
 */
function determineZone(state, userState = '') {
    // If userState matches state, it's intra-state
    if (userState && state.toUpperCase() === userState.toUpperCase()) {
        return 'intra-state';
    }
    // Check for remote areas (you can add more logic here)
    const remoteStates = ['LA', 'JK', 'AR', 'MN', 'ML', 'MZ', 'TR', 'SK', 'NL', 'PY']; // Remote states
    if (remoteStates.includes(state.toUpperCase())) {
        return 'remote';
    }
    // Default to inter-state
    return 'inter-state';
}

/**
 * Get shipping configuration
 * @returns {object} - Current shipping configuration
 */
function getShippingConfig() {
    return SHIPPING_CONFIG;
}

/**
 * Update shipping configuration
 * @param {object} config - New shipping configuration
 */
function updateShippingConfig(config) {
    Object.assign(SHIPPING_CONFIG, config);
}

module.exports = {
    calculateShipping,
    calculateInterStateShipping,
    calculateLocalShipping,
    determineZone,
    getShippingConfig,
    updateShippingConfig,
    SHIPPING_CONFIG
};
