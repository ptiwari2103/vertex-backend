/**
 * Utility functions for currency formatting
 */
require('dotenv').config();

// Get the currency unit from environment variables
const currencyUnit = process.env.CURRENCY_UNIT || '₹';

/**
 * Format a number as currency with the configured currency unit
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return `${currencyUnit}0`;
  
  // Format the number with commas for thousands separator
  const formattedAmount = parseFloat(amount)
    .toFixed(2)
    .replace(/\d(?=(\d{3})+\.)/g, '$&,');
  
  return `${currencyUnit}${formattedAmount}`;
};


const formatamount = (amount) => {
  if (amount === null || amount === undefined) return 0.00;
  
  return parseFloat(parseFloat(amount).toFixed(2));
};

module.exports = {
  currencyUnit,
  formatCurrency,
  formatamount
};
