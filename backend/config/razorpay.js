const Razorpay = require('razorpay');
const crypto = require('crypto');

/**
 * TECHNOVA Razorpay Configuration
 * Official SDK initialization & security verification helpers
 * Supports Test Mode and Live Mode via environment variables.
 */

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const currency = process.env.RAZORPAY_CURRENCY || 'INR';
const mode = process.env.RAZORPAY_MODE || 'test';

const isConfigured = Boolean(
  key_id &&
  key_secret &&
  !key_id.includes('placeholder') &&
  !key_secret.includes('placeholder')
);

let razorpayInstance = null;

if (isConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
    console.log(`✅ Razorpay SDK initialized in ${mode.toUpperCase()} mode with key: ${key_id.substring(0, 8)}...`);
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay SDK:', error.message);
  }
} else {
  console.warn('⚠️ Razorpay credentials not configured or set to placeholder in .env. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to accept live/test payments.');
}

/**
 * Verifies the Razorpay payment signature
 * Generated using HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!key_secret) {
    throw new Error('Razorpay key secret not configured on server');
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }
  const text = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(text)
    .digest('hex');

  const expBuf = Buffer.from(expectedSignature, 'utf8');
  const sigBuf = Buffer.from(razorpay_signature, 'utf8');

  if (expBuf.length !== sigBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expBuf, sigBuf);
}

/**
 * Verifies Razorpay Webhook signature
 * Generated using HMAC-SHA256(raw_request_body, webhook_secret)
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = webhook_secret || key_secret;
  if (!secret) {
    throw new Error('Razorpay webhook secret not configured on server');
  }
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

module.exports = {
  razorpay: razorpayInstance,
  isConfigured,
  getKeyId: () => key_id,
  getCurrency: () => currency,
  getMode: () => mode,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
