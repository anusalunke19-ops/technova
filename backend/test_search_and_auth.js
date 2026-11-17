const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 TECHNOVA SEARCH & AUTHORIZATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- PART 1: SEARCH FUNCTIONALITY ---
  console.log('--- 1. Testing Search Queries ---');

  const queries = [
    { q: 'smartphone', min: 10, note: 'Singular smartphone' },
    { q: 'smartphones', min: 10, note: 'Plural smartphones' },
    { q: 'phone', min: 10, note: 'General phone' },
    { q: 'samsung phone', min: 5, note: 'Multi-token: brand + category' },
    { q: 'apple phone', min: 5, note: 'Multi-token: brand + category' },
    { q: 'iphone 15', min: 2, note: 'Multi-token: brand series' },
    { q: 'sony headphones', min: 2, note: 'Multi-token: brand + synonym' },
    { q: 'smartwatches', min: 10, note: 'Plural category smartwatch' },
    { q: 'laptops', min: 10, note: 'Category laptop' },
    { q: 'gaming', min: 10, note: 'Category gaming' },
    { q: 'cameras', min: 5, note: 'Category camera' },
    { q: 'accessories', min: 5, note: 'Category accessories' }
  ];

  for (const { q, min, note } of queries) {
    const res = await request('GET', `/api/products/search?q=${encodeURIComponent(q)}`);
    const count = res.data?.products?.length || 0;
    const total = res.data?.total || 0;
    assert(
      res.status === 200 && total >= min,
      `Search '${q}' (${note}) returned ${total} results (page count: ${count})`
    );
  }

  // Test empty query returns empty list gracefully
  const emptyRes = await request('GET', '/api/products/search?q=');
  assert(
    emptyRes.status === 200 && emptyRes.data.products.length === 0,
    'Empty search query returns empty array gracefully'
  );

  // Test search sorting (price low to high)
  const sortRes = await request('GET', `/api/products/search?q=laptop&sort=price`);
  if (sortRes.data?.products?.length >= 2) {
    const p1 = sortRes.data.products[0].price;
    const p2 = sortRes.data.products[1].price;
    assert(p1 <= p2, `Search sorting by price works (First: $${p1}, Second: $${p2})`);
  }

  // --- PART 2: AUTHORIZATION ---
  console.log('\n--- 2. Testing Authorization & Authentication ---');

  // 2.1 Unauthenticated requests to protected endpoints must return 401
  const protectedEndpoints = [
    { method: 'GET', path: '/api/customers/profile', name: 'Customer Profile' },
    { method: 'GET', path: '/api/cart', name: 'Customer Cart' },
    { method: 'GET', path: '/api/wishlist', name: 'Customer Wishlist' },
    { method: 'GET', path: '/api/orders', name: 'My Orders' },
    { method: 'POST', path: '/api/payments/razorpay/create-order', name: 'Razorpay Create Order' },
  ];

  for (const ep of protectedEndpoints) {
    const res = await request(ep.method, ep.path);
    assert(
      res.status === 401 && res.data?.success === false,
      `Unauthenticated ${ep.method} ${ep.path} rejected with HTTP 401 (${ep.name})`
    );
  }

  // 2.2 Invalid token rejected with HTTP 403
  const badTokenRes = await request('GET', '/api/customers/profile', null, 'invalid.token.here');
  assert(
    badTokenRes.status === 403 && badTokenRes.data?.success === false,
    'Malformed/forged JWT token rejected with HTTP 403'
  );

  // 2.3 Login with demo account: demo@technova.com / test123
  console.log('\n--- 3. Testing Demo Accounts Login ---');
  const login1 = await request('POST', '/api/auth/login', {
    email: 'demo@technova.com',
    password: 'test123'
  });
  assert(
    login1.status === 200 && login1.data?.token && login1.data?.customer,
    `Login demo@technova.com / test123 successful! Token issued for: ${login1.data?.customer?.name}`
  );
  const demoToken = login1.data?.token;

  // 2.4 Login with demo account: alex@example.com / Password123!
  const login2 = await request('POST', '/api/auth/login', {
    email: 'alex@example.com',
    password: 'Password123!'
  });
  assert(
    login2.status === 200 && login2.data?.token,
    `Login alex@example.com / Password123! successful! Token issued for: ${login2.data?.customer?.name}`
  );

  // 2.5 Wrong password rejected
  const wrongPw = await request('POST', '/api/auth/login', {
    email: 'demo@technova.com',
    password: 'wrong_password_999'
  });
  assert(
    wrongPw.status === 401 && wrongPw.data?.success === false,
    'Login with incorrect password rejected with HTTP 401'
  );

  // 2.6 Authenticated requests with valid token work
  console.log('\n--- 4. Testing Authenticated Access with Token ---');
  const profileRes = await request('GET', '/api/customers/profile', null, demoToken);
  assert(
    profileRes.status === 200 && profileRes.data?.customer?.email === 'demo@technova.com',
    `Authenticated GET /api/customers/profile succeeds for ${profileRes.data?.customer?.name}`
  );

  const cartRes = await request('GET', '/api/cart', null, demoToken);
  assert(
    cartRes.status === 200 && Array.isArray(cartRes.data?.items),
    `Authenticated GET /api/cart succeeds (cart items array returned)`
  );

  const wishlistRes = await request('GET', '/api/wishlist', null, demoToken);
  assert(
    wishlistRes.status === 200 && Array.isArray(wishlistRes.data?.items),
    `Authenticated GET /api/wishlist succeeds (wishlist items array returned)`
  );

  console.log('\n========================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
