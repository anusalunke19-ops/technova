const { v4: uuidv4 } = require('uuid');

/**
 * SIMULATED PAYMENT SERVICE
 * This is an ACADEMIC PROJECT - payments are simulated, NOT real.
 * No actual bank transactions or card processing occurs.
 */

const DEMO_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient: '4000000000009995'
};

exports.simulatePayment = async ({ method, amount, cardDetails, metadata }) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const reference = `TN-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  if (method === 'card') {
    const cardNumber = (cardDetails?.cardNumber || '').replace(/\s/g, '');
    
    if (cardNumber === DEMO_CARDS.decline) {
      return { success: false, reference, message: 'Card declined. Please use a different payment method.', code: 'CARD_DECLINED' };
    }
    if (cardNumber === DEMO_CARDS.insufficient) {
      return { success: false, reference, message: 'Insufficient funds.', code: 'INSUFFICIENT_FUNDS' };
    }
    // All other cards succeed (demo mode)
    return { success: true, reference, message: 'Payment processed successfully (Simulated)', method: 'card', amount };
  }

  if (method === 'paypal') {
    // 95% success rate simulation
    const success = Math.random() > 0.05;
    if (!success) return { success: false, reference, message: 'PayPal payment failed. Please try again.', code: 'PAYPAL_ERROR' };
    return { success: true, reference, message: 'PayPal payment processed (Simulated)', method: 'paypal', amount };
  }

  if (method === 'apple_pay') {
    return { success: true, reference, message: 'Apple Pay payment processed (Simulated)', method: 'apple_pay', amount };
  }

  return { success: false, reference: null, message: 'Unknown payment method', code: 'INVALID_METHOD' };
};

exports.DEMO_CARDS = DEMO_CARDS;
