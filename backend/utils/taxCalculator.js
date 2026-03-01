/**
 * Tax Calculator Utility
 * Calculates tax based on configurable rates
 */

// Default tax configuration
const TAX_CONFIG = {
    // Tax rates by region/state (percentage)
    rates: {
        'default': 18, // 18% GST default
        'UT': 18,     // Union Territories
        'MH': 18,     // Maharashtra
        'DL': 18,     // Delhi
        'KA': 18,     // Karnataka
        'TN': 18,     // Tamil Nadu
        'AP': 18,     // Andhra Pradesh
        'TG': 18,     // Telangana
    },
    // Tax types
    cgst: 9,  // Central GST
    sgst: 9,  // State GST
    igst: 18  // Integrated GST (for inter-state)
};

/**
 * Calculate tax amount based on subtotal
 * @param {number} subtotal - The subtotal amount before tax
 * @param {string} state - The state code for tax calculation
 * @returns {object} - Tax breakdown
 */
function calculateTax(subtotal, state = 'default') {
    const rate = TAX_CONFIG.rates[state] || TAX_CONFIG.rates['default'];
    
    const taxAmount = (subtotal * rate) / 100;
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    
    return {
        subtotal: subtotal,
        taxRate: rate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: Math.round(taxAmount * 100) / 100 // IGST = CGST + SGST for inter-state
    };
}

/**
 * Calculate inclusive tax (tax included in amount)
 * @param {number} totalAmount - The total amount including tax
 * @param {string} state - The state code for tax calculation
 * @returns {object} - Tax breakdown
 */
function calculateInclusiveTax(totalAmount, state = 'default') {
    const rate = TAX_CONFIG.rates[state] || TAX_CONFIG.rates['default'];
    const baseAmount = totalAmount / (1 + rate / 100);
    const taxAmount = totalAmount - baseAmount;
    
    return {
        baseAmount: Math.round(baseAmount * 100) / 100,
        taxRate: rate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: totalAmount
    };
}

/**
 * Get available tax rates
 * @returns {object} - Available tax rates
 */
function getTaxRates() {
    return TAX_CONFIG.rates;
}

/**
 * Update tax configuration
 * @param {object} config - New tax configuration
 */
function updateTaxConfig(config) {
    Object.assign(TAX_CONFIG, config);
}

module.exports = {
    calculateTax,
    calculateInclusiveTax,
    getTaxRates,
    updateTaxConfig,
    TAX_CONFIG
};
