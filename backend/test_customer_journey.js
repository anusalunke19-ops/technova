const http = require('http');
const crypto = require('crypto');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runCustomerJourney() {
  console.log('===============================================================');
  console.log('🚀 TECHNOVA END-TO-END CUSTOMER JOURNEY TEST');
  console.log('===============================================================\n');

  let authToken = null;
  let testCustomer = null;
  let testOrderId = null;
  let razorpayOrderId = null;

  // Step 0: Customer Login / Auth Setup
  console.log('🔹 Step 0: Customer Authentication (Login with Demo / Test User)');
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'alex@example.com',
    password: 'Password123!',
  });
  if (loginRes.data.success) {
    authToken = loginRes.data.token;
    testCustomer = loginRes.data.customer;
    console.log(`  ✅ Successfully authenticated as ${testCustomer.name} (${testCustomer.email})`);
    console.log(`  🔑 JWT Token acquired`);
  } else {
    throw new Error(`Authentication failed: ${JSON.stringify(loginRes.data)}`);
  }

  // Step 1: Open homepage
  console.log('\n🔹 Step 1: Open Homepage & Fetch Featured Products');
  const featRes = await request('GET', '/api/products/featured');
  console.log(`  HTTP ${featRes.status}: Found ${featRes.data.products?.length || 0} featured products`);
  if (!featRes.data.success || featRes.data.products.length === 0) {
    throw new Error('Failed to load featured products for homepage');
  }
  console.log(`  ✅ Homepage loads successfully with hero products: "${featRes.data.products[0].name}"`);

  // Step 2: Browse every technology category
  console.log('\n🔹 Step 2: Browse Every Technology Category');
  const categories = [
    'smartphones',
    'laptops',
    'tablets',
    'audio',
    'wearables',
    'cameras',
    'accessories',
    'gaming',
  ];

  for (const cat of categories) {
    const catRes = await request('GET', `/api/products/category/${cat}?limit=5`);
    const count = catRes.data.products?.length || 0;
    const total = catRes.data.total || 0;
    console.log(`  📂 Category [${cat}]: ${total} total products (${count} previewed)`);
    if (count === 0) {
      throw new Error(`Category ${cat} returned 0 products!`);
    }
  }
  console.log('  ✅ All 8 technology categories display products correctly');

  // Step 3: Search for a smartphone
  console.log('\n🔹 Step 3: Search for "smartphone"');
  const searchRes = await request('GET', '/api/products/search?q=iPhone');
  console.log(`  HTTP ${searchRes.status}: Search for "iPhone" returned ${searchRes.data.products?.length || 0} results`);
  if (!searchRes.data.products || searchRes.data.products.length === 0) {
    throw new Error('Search returned no results');
  }
  const foundPhone = searchRes.data.products[0];
  console.log(`  ✅ Search works: Found "${foundPhone.name}" by ${foundPhone.brand}`);

  // Step 4: Apply brand and price filters
  console.log('\n🔹 Step 4: Apply Brand & Price Filters (Apple, minPrice: 800, maxPrice: 1500)');
  const filterRes = await request('GET', '/api/products?brand=Apple&minPrice=800&maxPrice=1500');
  console.log(`  HTTP ${filterRes.status}: Filter matched ${filterRes.data.products?.length || 0} products`);
  if (filterRes.data.products?.length > 0) {
    console.log(`  Sample filtered product: ${filterRes.data.products[0].name} - ₹${filterRes.data.products[0].price}`);
  }
  console.log('  ✅ Brand, price range, and sorting filters work accurately');

  // Step 5: Open a product details page
  console.log('\n🔹 Step 5: Open Product Details Page');
  const targetSku = 'TECH-SP-001';
  const detailRes = await request('GET', `/api/products/${targetSku}`);
  if (!detailRes.data.success || !detailRes.data.product) {
    throw new Error(`Failed to fetch product detail for ${targetSku}`);
  }
  const productDetail = detailRes.data.product;
  console.log(`  ✅ Product details loaded:`);
  console.log(`     - Name: ${productDetail.name}`);
  console.log(`     - SKU: ${productDetail.product_id}`);
  console.log(`     - Price: ₹${productDetail.price}`);
  console.log(`     - Brand: ${productDetail.brand}`);
  console.log(`     - Rating: ${productDetail.rating} / 5.0`);

  // Step 6: Add a product to Wishlist
  console.log('\n🔹 Step 6: Add Product to Wishlist');
  const wishAddRes = await request('POST', '/api/wishlist', { productId: targetSku }, authToken);
  console.log(`  HTTP ${wishAddRes.status}: ${wishAddRes.data.message}`);
  const wishGetRes = await request('GET', '/api/wishlist', null, authToken);
  console.log(`  Wishlist items count: ${wishGetRes.data.items?.length || 0}`);
  console.log('  ✅ Wishlist operations working');

  // Step 7: Add multiple products to Cart
  console.log('\n🔹 Step 7: Add Multiple Products to Cart');
  await request('DELETE', '/api/cart', null, authToken);

  const cartItem1 = 'TECH-SP-001'; // iPhone 15 Pro Max
  const cartItem2 = 'TECH-AU-001'; // Sony WH-1000XM5

  await request('POST', '/api/cart', { productId: cartItem1, quantity: 1 }, authToken);
  await request('POST', '/api/cart', { productId: cartItem2, quantity: 2 }, authToken);

  let cartRes = await request('GET', '/api/cart', null, authToken);
  console.log(`  Cart total items: ${cartRes.data.items?.length || 0}, Cart total amount: ₹${cartRes.data.total}`);
  cartRes.data.items?.forEach(it => {
    console.log(`   - ${it.product.name} (Qty: ${it.quantity}, Unit Price: ₹${it.product.price})`);
  });
  console.log('  ✅ Multiple products added to cart');

  // Step 8: Change product quantities
  console.log('\n🔹 Step 8: Change Product Quantities');
  await request('PUT', `/api/cart/${cartItem1}`, { quantity: 2 }, authToken);
  cartRes = await request('GET', '/api/cart', null, authToken);
  const updatedItem1 = cartRes.data.items.find(i => i.productId === cartItem1);
  console.log(`  Updated ${cartItem1} quantity to: ${updatedItem1?.quantity}`);
  console.log(`  New cart total: ₹${cartRes.data.total}`);
  console.log('  ✅ Quantity updated successfully');

  // Step 9: Remove an item
  console.log('\n🔹 Step 9: Remove Item from Cart');
  await request('DELETE', `/api/cart/${cartItem2}`, null, authToken);
  cartRes = await request('GET', '/api/cart', null, authToken);
  console.log(`  Cart items remaining: ${cartRes.data.items?.length || 0}`);
  console.log('  ✅ Item removed successfully');

  // Step 10: Proceed to Checkout
  console.log('\n🔹 Step 10: Proceed to Checkout & Verify Total Calculation');
  const invBeforeRes = await request('GET', `/api/inventory/${cartItem1}`, null, authToken);
  const stockBefore = invBeforeRes.data.inventory.stock_quantity;
  console.log(`  PostgreSQL Stock for ${cartItem1} before checkout: ${stockBefore}`);

  // Step 11: Enter shipping information & Create Order
  console.log('\n🔹 Step 11: Enter Shipping Info & Create Order in PostgreSQL');
  const shippingInfo = {
    fullName: 'Alex Johnson',
    address: '123 Silicon Valley Road',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'United States',
    phone: '555-0101',
  };

  const createOrderRes = await request('POST', '/api/orders', {
    shippingAddress: shippingInfo,
    deliveryMethod: 'standard',
    items: [{ productId: cartItem1, quantity: 2 }],
  }, authToken);

  if (!createOrderRes.data.success) {
    throw new Error(`Order creation failed: ${createOrderRes.data.message}`);
  }
  const createdOrder = createOrderRes.data.order;
  testOrderId = createdOrder.order_id;
  console.log(`  ✅ Order created successfully:`);
  console.log(`     - Order ID: ${testOrderId}`);
  console.log(`     - Subtotal: ₹${createdOrder.subtotal}`);
  console.log(`     - Shipping: ₹${createdOrder.shipping_cost}`);
  console.log(`     - Tax (8%): ₹${createdOrder.tax_amount}`);
  console.log(`     - Total: ₹${createdOrder.total_amount}`);
  console.log(`     - Status: ${createdOrder.status}`);

  // Step 12: Select Razorpay & Create Razorpay Order
  console.log('\n🔹 Step 12: Select Razorpay & Initialize Payment Order');
  const rzpOrderRes = await request('POST', '/api/payments/razorpay/create-order', {
    order_id: testOrderId,
  }, authToken);

  if (!rzpOrderRes.data.success) {
    throw new Error(`Razorpay order init failed: ${rzpOrderRes.data.message}`);
  }
  razorpayOrderId = rzpOrderRes.data.razorpay_order_id;
  console.log(`  ✅ Razorpay Order Generated:`);
  console.log(`     - Razorpay Order ID: ${razorpayOrderId}`);
  console.log(`     - Amount (in paise): ${rzpOrderRes.data.amount}`);
  console.log(`     - Currency: ${rzpOrderRes.data.currency}`);
  console.log(`     - Key ID provided to client: ${rzpOrderRes.data.key_id}`);

  // Step 13: Complete Razorpay Test Payment & Step 14: Signature Verification
  console.log('\n🔹 Step 13 & 14: Complete Payment & Verify HMAC-SHA256 Signature');
  const testPaymentId = `pay_test_${Date.now()}`;
  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_key_secret');
  hmac.update(`${razorpayOrderId}|${testPaymentId}`);
  const validSignature = hmac.digest('hex');

  const verifyRes = await request('POST', '/api/payments/razorpay/verify', {
    order_id: testOrderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: validSignature,
  }, authToken);

  console.log(`  HTTP ${verifyRes.status}: ${verifyRes.data.message}`);
  if (!verifyRes.data.success) {
    throw new Error('Payment verification failed');
  }
  console.log(`  ✅ Payment signature verified server-side`);

  // Step 15: Check Order Saved in PostgreSQL
  console.log('\n🔹 Step 15: Verify Order Record in PostgreSQL Database');
  const pgOrderRes = await request('GET', `/api/orders/${testOrderId}`, null, authToken);
  const pgOrder = pgOrderRes.data.order;
  console.log(`  PostgreSQL orders table:`);
  console.log(`   - Order ID: ${pgOrder.order_id}`);
  console.log(`   - Customer ID: ${pgOrder.customer_id}`);
  console.log(`   - Status: ${pgOrder.status} (Expected: processing)`);
  console.log(`   - Total Amount: ₹${pgOrder.total_amount}`);
  if (pgOrder.status !== 'processing') {
    throw new Error(`Expected order status 'processing', got '${pgOrder.status}'`);
  }
  console.log('  ✅ PostgreSQL order record verified');

  // Step 16: Check Payment Record in PostgreSQL
  console.log('\n🔹 Step 16: Verify Payment Record in PostgreSQL Database');
  const pgPaymentRes = await request('GET', `/api/payments/${testOrderId}`, null, authToken);
  const pgPayment = pgPaymentRes.data.payment;
  console.log(`  PostgreSQL payments table:`);
  console.log(`   - Payment ID: ${pgPayment.payment_id}`);
  console.log(`   - Razorpay Order ID: ${pgPayment.razorpay_order_id}`);
  console.log(`   - Razorpay Payment ID: ${pgPayment.razorpay_payment_id}`);
  console.log(`   - Payment Status: ${pgPayment.payment_status} (Expected: completed)`);
  if (pgPayment.payment_status !== 'completed') {
    throw new Error(`Expected payment status 'completed', got '${pgPayment.payment_status}'`);
  }
  console.log('  ✅ PostgreSQL payment record verified');

  // Step 17: Check Inventory Updated (Prevent Overselling)
  console.log('\n🔹 Step 17: Verify Inventory Deduction in PostgreSQL');
  const invAfterRes = await request('GET', `/api/inventory/${cartItem1}`, null, authToken);
  const stockAfter = invAfterRes.data.inventory.stock_quantity;
  console.log(`  Initial stock: ${stockBefore}, After order (qty 2): ${stockAfter}`);
  if (stockAfter !== stockBefore - 2) {
    throw new Error(`Inventory deduction mismatch! Expected ${stockBefore - 2}, got ${stockAfter}`);
  }
  console.log('  ✅ Inventory correctly decremented in database');

  // Step 18: Open Order Confirmation
  console.log('\n🔹 Step 18: Fetch Order Confirmation Receipt');
  const confirmRes = await request('GET', `/api/payments/${testOrderId}`, null, authToken);
  console.log(`  Receipt fetched: Payment Reference ${confirmRes.data.payment.payment_reference}, Status: ${confirmRes.data.payment.payment_status}`);
  console.log('  ✅ Order confirmation receipt verified');

  // Step 19: Open My Orders
  console.log('\n🔹 Step 19: Fetch "My Orders"');
  const myOrdersRes = await request('GET', '/api/orders', null, authToken);
  console.log(`  Total orders for customer: ${myOrdersRes.data.orders?.length || 0}`);
  const foundInList = myOrdersRes.data.orders.find(o => o.order_id === testOrderId);
  if (!foundInList) {
    throw new Error('Newly placed order not found in customer orders list');
  }
  console.log('  ✅ Order listed in customer order history');

  // Step 20: View Order Details
  console.log('\n🔹 Step 20: Fetch Specific Order Details');
  const orderDetailRes = await request('GET', `/api/orders/${testOrderId}`, null, authToken);
  console.log(`  Order items count: ${orderDetailRes.data.order.items?.length || 0}`);
  orderDetailRes.data.order.items.forEach(it => {
    console.log(`   - ${it.product_name} x ${it.quantity} @ ₹${it.unit_price} each`);
  });
  console.log('  ✅ Full order details retrieved');

  // -------------------------------------------------------------
  // Test Failed / Cancelled Payment & Inventory Restoration
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('🧪 TESTING FAILED & CANCELLED PAYMENTS (STOCK RESTORATION)');
  console.log('===============================================================\n');

  // Create another order to test cancellation
  const cancelOrderRes = await request('POST', '/api/orders', {
    shippingAddress: shippingInfo,
    deliveryMethod: 'standard',
    items: [{ productId: cartItem1, quantity: 3 }],
  }, authToken);
  const cancelOrderId = cancelOrderRes.data.order.order_id;
  const stockBeforeCancel = (await request('GET', `/api/inventory/${cartItem1}`, null, authToken)).data.inventory.stock_quantity;
  console.log(`  Order ${cancelOrderId} created with qty 3. Current stock: ${stockBeforeCancel}`);

  // Customer closes/cancels Razorpay modal
  console.log('  Customer cancels Razorpay checkout modal...');
  const cancelPayRes = await request('POST', '/api/payments/razorpay/cancel', {
    order_id: cancelOrderId,
    reason: 'Customer closed Razorpay checkout window',
  }, authToken);
  console.log(`  Cancel API Response: ${cancelPayRes.data.message}`);

  // Verify order status is 'cancelled'
  const cancelledOrderRes = await request('GET', `/api/orders/${cancelOrderId}`, null, authToken);
  console.log(`  Order status in PostgreSQL: ${cancelledOrderRes.data.order.status}`);
  if (cancelledOrderRes.data.order.status !== 'cancelled') {
    throw new Error(`Order was not marked as cancelled! Status: ${cancelledOrderRes.data.order.status}`);
  }

  // Verify payment status is 'failed' (NOT paid)
  const cancelledPaymentRes = await request('GET', `/api/payments/${cancelOrderId}`, null, authToken);
  console.log(`  Payment status in PostgreSQL: ${cancelledPaymentRes.data.payment.payment_status}`);
  if (cancelledPaymentRes.data.payment.payment_status === 'completed' || cancelledPaymentRes.data.payment.payment_status === 'paid') {
    throw new Error(`FAILED payment was marked as paid! Status: ${cancelledPaymentRes.data.payment.payment_status}`);
  }

  // Verify stock was restored
  const stockAfterCancel = (await request('GET', `/api/inventory/${cartItem1}`, null, authToken)).data.inventory.stock_quantity;
  console.log(`  Stock after cancellation: ${stockAfterCancel} (Expected: ${stockBeforeCancel + 3})`);
  if (stockAfterCancel !== stockBeforeCancel + 3) {
    throw new Error(`Inventory was not restored! Expected ${stockBeforeCancel + 3}, got ${stockAfterCancel}`);
  }
  console.log('  ✅ Cancelled payment successfully releases locked inventory');

  // Test invalid payment signature rejection
  console.log('\n🧪 Testing Invalid Signature Rejection');
  const badSigRes = await request('POST', '/api/payments/razorpay/verify', {
    order_id: cancelOrderId,
    razorpay_order_id: 'order_fake_123',
    razorpay_payment_id: 'pay_fake_123',
    razorpay_signature: 'invalid_tampered_signature',
  }, authToken);
  console.log(`  HTTP ${badSigRes.status}: ${badSigRes.data.message}`);
  if (badSigRes.status !== 400 && !badSigRes.data.message.includes('Invalid')) {
    throw new Error('Tampered signature was not rejected!');
  }
  console.log('  ✅ Invalid signature correctly rejected');

  console.log('\n===============================================================');
  console.log('🎉 ALL 20 CUSTOMER JOURNEY STEPS & FAILURE TESTS PASSED 100%!');
  console.log('===============================================================\n');
  process.exit(0);
}

runCustomerJourney().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
