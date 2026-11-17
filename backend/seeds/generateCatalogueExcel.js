/**
 * TECHNOVA Product Catalogue Excel Generator
 * Generates backend/seeds/products_catalogue.xlsx with 320 real technology products
 * (40 products each across all 8 categories)
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 8 Categories definition
const categories = [
  { name: 'Smartphones', slug: 'smartphones', icon: '📱', desc: 'Latest flagship, mid-range, and budget smartphones' },
  { name: 'Laptops', slug: 'laptops', icon: '💻', desc: 'High-performance ultrabooks, gaming laptops, and creator workstations' },
  { name: 'Tablets', slug: 'tablets', icon: '📟', desc: 'Versatile tablets for productivity, creativity, and streaming' },
  { name: 'Headphones & Earbuds', slug: 'headphones-earbuds', icon: '🎧', desc: 'Audiophile headphones, ANC over-ears, and wireless earbuds' },
  { name: 'Smartwatches', slug: 'smartwatches', icon: '⌚', desc: 'Advanced fitness trackers, GPS sports watches, and luxury wearables' },
  { name: 'Cameras', slug: 'cameras', icon: '📷', desc: 'Mirrorless, DSLR, action cameras, and professional creator gear' },
  { name: 'Computer Accessories', slug: 'computer-accessories', icon: '🖥️', desc: 'Monitors, ergonomic keyboards, precision mice, docks, and storage' },
  { name: 'Gaming Products', slug: 'gaming', icon: '🎮', desc: 'Consoles, controllers, VR headsets, mechanical keyboards, and gaming gear' },
];

console.log('Building 320 authentic technology products across 8 categories...');

// Helper to format currency/numbers
const round = (num) => Math.round(num * 100) / 100;

// High quality verified technology imagery pool
const imgMap = {
  smartphones: [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600',
    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600',
  ],
  laptops: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600',
    'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600',
    'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600',
  ],
  tablets: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600',
    'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=600',
    'https://images.unsplash.com/photo-1527698266440-12104e498b76?w=600',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
  ],
  headphones: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600',
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600',
    'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600',
  ],
  smartwatches: [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600',
    'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=600',
  ],
  cameras: [
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600',
    'https://images.unsplash.com/photo-1495121553079-4c61bcce1894?w=600',
    'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=600',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600',
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600',
    'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=600',
    'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=600',
    'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=600',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600',
  ],
};

function getImg(category, idx) {
  const pool = imgMap[category] || imgMap['accessories'];
  return pool[idx % pool.length];
}

// Generate 40 products for each category
const allProducts = [];

// 1. SMARTPHONES (40 products)
const phoneModels = [
  { name: 'iPhone 15 Pro Max', brand: 'Apple', price: 1199.99, orig: 1299.99, ram: '8 GB', storage: '256 GB', proc: 'A17 Pro', batt: '4422 mAh', disp: '6.7" Super Retina XDR OLED 120Hz', cam: '48MP Triple Pro', os: 'iOS 17' },
  { name: 'iPhone 15 Pro', brand: 'Apple', price: 999.99, orig: 1099.99, ram: '8 GB', storage: '128 GB', proc: 'A17 Pro', batt: '3274 mAh', disp: '6.1" Super Retina XDR OLED 120Hz', cam: '48MP Triple Pro', os: 'iOS 17' },
  { name: 'iPhone 15 Plus', brand: 'Apple', price: 899.99, orig: 999.99, ram: '6 GB', storage: '128 GB', proc: 'A16 Bionic', batt: '4383 mAh', disp: '6.7" Super Retina XDR OLED', cam: '48MP Dual', os: 'iOS 17' },
  { name: 'iPhone 15', brand: 'Apple', price: 799.99, orig: 849.99, ram: '6 GB', storage: '128 GB', proc: 'A16 Bionic', batt: '3349 mAh', disp: '6.1" Super Retina XDR OLED', cam: '48MP Dual', os: 'iOS 17' },
  { name: 'iPhone 14', brand: 'Apple', price: 699.99, orig: 799.99, ram: '6 GB', storage: '128 GB', proc: 'A15 Bionic', batt: '3279 mAh', disp: '6.1" Super Retina XDR', cam: '12MP Dual', os: 'iOS 16' },
  { name: 'iPhone SE (3rd Gen)', brand: 'Apple', price: 429.99, orig: 479.99, ram: '4 GB', storage: '64 GB', proc: 'A15 Bionic', batt: '2018 mAh', disp: '4.7" Retina HD', cam: '12MP Wide', os: 'iOS 17' },
  { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 1299.99, orig: 1399.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 3', batt: '5000 mAh', disp: '6.8" Dynamic AMOLED 2X 120Hz', cam: '200MP Quad + S-Pen', os: 'Android 14' },
  { name: 'Samsung Galaxy S24+', brand: 'Samsung', price: 999.99, orig: 1099.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 3', batt: '4900 mAh', disp: '6.7" Dynamic AMOLED 2X 120Hz', cam: '50MP Triple', os: 'Android 14' },
  { name: 'Samsung Galaxy S24', brand: 'Samsung', price: 799.99, orig: 859.99, ram: '8 GB', storage: '128 GB', proc: 'Snapdragon 8 Gen 3', batt: '4000 mAh', disp: '6.2" Dynamic AMOLED 2X 120Hz', cam: '50MP Triple', os: 'Android 14' },
  { name: 'Samsung Galaxy Z Fold 5', brand: 'Samsung', price: 1799.99, orig: 1919.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 2', batt: '4400 mAh', disp: '7.6" Foldable AMOLED 120Hz', cam: '50MP Triple', os: 'Android 13' },
  { name: 'Samsung Galaxy Z Flip 5', brand: 'Samsung', price: 999.99, orig: 1119.99, ram: '8 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 2', batt: '3700 mAh', disp: '6.7" Foldable Dynamic AMOLED', cam: '12MP Dual', os: 'Android 13' },
  { name: 'Samsung Galaxy A54 5G', brand: 'Samsung', price: 449.99, orig: 499.99, ram: '8 GB', storage: '128 GB', proc: 'Exynos 1380', batt: '5000 mAh', disp: '6.4" Super AMOLED 120Hz', cam: '50MP Triple', os: 'Android 14' },
  { name: 'Samsung Galaxy A34 5G', brand: 'Samsung', price: 349.99, orig: 399.99, ram: '6 GB', storage: '128 GB', proc: 'MediaTek Dimensity 1080', batt: '5000 mAh', disp: '6.6" Super AMOLED 120Hz', cam: '48MP Triple', os: 'Android 13' },
  { name: 'Google Pixel 8 Pro', brand: 'Google', price: 999.99, orig: 1099.99, ram: '12 GB', storage: '128 GB', proc: 'Google Tensor G3', batt: '5050 mAh', disp: '6.7" Super Actua OLED 120Hz', cam: '50MP Triple with Pro AI', os: 'Android 14' },
  { name: 'Google Pixel 8', brand: 'Google', price: 699.99, orig: 799.99, ram: '8 GB', storage: '128 GB', proc: 'Google Tensor G3', batt: '4575 mAh', disp: '6.2" Actua OLED 120Hz', cam: '50MP Dual', os: 'Android 14' },
  { name: 'Google Pixel 7a', brand: 'Google', price: 449.99, orig: 499.99, ram: '8 GB', storage: '128 GB', proc: 'Google Tensor G2', batt: '4385 mAh', disp: '6.1" OLED 90Hz', cam: '64MP Dual', os: 'Android 13' },
  { name: 'Google Pixel Fold', brand: 'Google', price: 1799.99, orig: 1899.99, ram: '12 GB', storage: '256 GB', proc: 'Google Tensor G2', batt: '4821 mAh', disp: '7.6" Foldable OLED 120Hz', cam: '48MP Triple', os: 'Android 13' },
  { name: 'OnePlus 12', brand: 'OnePlus', price: 799.99, orig: 899.99, ram: '16 GB', storage: '512 GB', proc: 'Snapdragon 8 Gen 3', batt: '5400 mAh (100W)', disp: '6.82" ProXDR AMOLED 120Hz', cam: '50MP Hasselblad Triple', os: 'OxygenOS 14' },
  { name: 'OnePlus 12R', brand: 'OnePlus', price: 499.99, orig: 599.99, ram: '8 GB', storage: '128 GB', proc: 'Snapdragon 8 Gen 2', batt: '5500 mAh (100W)', disp: '6.78" AMOLED 120Hz', cam: '50MP Sony IMX890', os: 'OxygenOS 14' },
  { name: 'OnePlus Open', brand: 'OnePlus', price: 1699.99, orig: 1799.99, ram: '16 GB', storage: '512 GB', proc: 'Snapdragon 8 Gen 2', batt: '4805 mAh', disp: '7.82" Flexi-fluid AMOLED', cam: '48MP Hasselblad Triple', os: 'OxygenOS 13' },
  { name: 'OnePlus Nord 3 5G', brand: 'OnePlus', price: 419.99, orig: 469.99, ram: '8 GB', storage: '128 GB', proc: 'Dimensity 9000', batt: '5000 mAh (80W)', disp: '6.74" Super Fluid AMOLED', cam: '50MP Sony IMX890', os: 'OxygenOS 13' },
  { name: 'Xiaomi 14 Ultra', brand: 'Xiaomi', price: 1399.99, orig: 1499.99, ram: '16 GB', storage: '512 GB', proc: 'Snapdragon 8 Gen 3', batt: '5000 mAh', disp: '6.73" LTPO AMOLED 120Hz', cam: '50MP Quad Leica Optics', os: 'HyperOS' },
  { name: 'Xiaomi 14', brand: 'Xiaomi', price: 899.99, orig: 999.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 3', batt: '4610 mAh (90W)', disp: '6.36" LTPO OLED 120Hz', cam: '50MP Triple Leica', os: 'HyperOS' },
  { name: 'Xiaomi 13T Pro', brand: 'Xiaomi', price: 699.99, orig: 799.99, ram: '12 GB', storage: '256 GB', proc: 'Dimensity 9200+', batt: '5000 mAh (120W)', disp: '6.67" CrystalRes AMOLED 144Hz', cam: '50MP Leica Triple', os: 'MIUI 14' },
  { name: 'Redmi Note 13 Pro+ 5G', brand: 'Xiaomi', price: 399.99, orig: 449.99, ram: '8 GB', storage: '256 GB', proc: 'Dimensity 7200-Ultra', batt: '5000 mAh (120W)', disp: '6.67" Curved AMOLED 120Hz', cam: '200MP OIS Camera', os: 'MIUI 14' },
  { name: 'Redmi Note 13 5G', brand: 'Xiaomi', price: 249.99, orig: 299.99, ram: '6 GB', storage: '128 GB', proc: 'Dimensity 6080', batt: '5000 mAh', disp: '6.67" FHD+ AMOLED 120Hz', cam: '108MP Dual', os: 'MIUI 14' },
  { name: 'Motorola Edge 40 Pro', brand: 'Motorola', price: 799.99, orig: 899.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 2', batt: '4600 mAh (125W)', disp: '6.67" pOLED 165Hz', cam: '50MP Triple', os: 'Android 13' },
  { name: 'Motorola Edge 40 Neo', brand: 'Motorola', price: 329.99, orig: 399.99, ram: '8 GB', storage: '256 GB', proc: 'Dimensity 7030', batt: '5000 mAh (68W)', disp: '6.55" Curved pOLED 144Hz', cam: '50MP OIS Dual', os: 'Android 13' },
  { name: 'Motorola Razr 40 Ultra', brand: 'Motorola', price: 999.99, orig: 1099.99, ram: '8 GB', storage: '256 GB', proc: 'Snapdragon 8+ Gen 1', batt: '3800 mAh', disp: '6.9" Foldable pOLED 165Hz', cam: '12MP Dual', os: 'Android 13' },
  { name: 'Nothing Phone (2)', brand: 'Nothing', price: 599.99, orig: 699.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8+ Gen 1', batt: '4700 mAh', disp: '6.7" Flexible LTPO OLED 120Hz', cam: '50MP Dual + Glyph Interface', os: 'Nothing OS 2.5' },
  { name: 'Nothing Phone (2a)', brand: 'Nothing', price: 349.99, orig: 399.99, ram: '8 GB', storage: '128 GB', proc: 'Dimensity 7200 Pro', batt: '5000 mAh (45W)', disp: '6.7" AMOLED 120Hz', cam: '50MP Dual', os: 'Nothing OS 2.5' },
  { name: 'Sony Xperia 1 V', brand: 'Sony', price: 1399.99, orig: 1499.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 2', batt: '5000 mAh', disp: '6.5" 4K HDR OLED 120Hz', cam: '48MP Exmor T Triple Pro', os: 'Android 13' },
  { name: 'Sony Xperia 5 V', brand: 'Sony', price: 999.99, orig: 1099.99, ram: '8 GB', storage: '128 GB', proc: 'Snapdragon 8 Gen 2', batt: '5000 mAh', disp: '6.1" FHD+ HDR OLED 120Hz', cam: '48MP Dual ZEISS', os: 'Android 13' },
  { name: 'ASUS Zenfone 10', brand: 'ASUS', price: 699.99, orig: 799.99, ram: '8 GB', storage: '128 GB', proc: 'Snapdragon 8 Gen 2', batt: '4300 mAh', disp: '5.9" AMOLED 144Hz Compact', cam: '50MP Gimbal OIS', os: 'Android 13' },
  { name: 'ASUS ROG Phone 8 Pro', brand: 'ASUS', price: 1199.99, orig: 1299.99, ram: '16 GB', storage: '512 GB', proc: 'Snapdragon 8 Gen 3', batt: '5500 mAh (65W)', disp: '6.78" Samsung AMOLED 165Hz', cam: '50MP Triple OIS', os: 'ROG UI Android 14' },
  { name: 'Vivo X100 Pro', brand: 'Vivo', price: 1099.99, orig: 1199.99, ram: '16 GB', storage: '512 GB', proc: 'Dimensity 9300', batt: '5400 mAh (100W)', disp: '6.78" LTPO AMOLED 120Hz', cam: '50MP ZEISS 1-inch sensor', os: 'Funtouch OS 14' },
  { name: 'Oppo Find N3 Flip', brand: 'Oppo', price: 899.99, orig: 999.99, ram: '12 GB', storage: '256 GB', proc: 'Dimensity 9200', batt: '4300 mAh', disp: '6.8" Foldable AMOLED 120Hz', cam: '50MP Hasselblad Triple', os: 'ColorOS 13' },
  { name: 'Realme GT 5 Pro', brand: 'Realme', price: 649.99, orig: 729.99, ram: '12 GB', storage: '256 GB', proc: 'Snapdragon 8 Gen 3', batt: '5400 mAh (100W)', disp: '6.78" AMOLED 144Hz 4500 nits', cam: '50MP Sony LYT-808 Periscope', os: 'Realme UI 5.0' },
  { name: 'Honor Magic 6 Pro', brand: 'Honor', price: 1199.99, orig: 1299.99, ram: '12 GB', storage: '512 GB', proc: 'Snapdragon 8 Gen 3', batt: '5600 mAh', disp: '6.8" LTPO OLED 120Hz', cam: '180MP Periscope Telephoto', os: 'MagicOS 8.0' },
  { name: 'Poco X6 Pro 5G', brand: 'Poco', price: 319.99, orig: 369.99, ram: '8 GB', storage: '256 GB', proc: 'Dimensity 8300-Ultra', batt: '5000 mAh (67W)', disp: '6.67" CrystalRes AMOLED 120Hz', cam: '64MP OIS Triple', os: 'HyperOS' },
];

phoneModels.forEach((m, i) => {
  allProducts.push({
    product_id: `TECH-SP-${String(i + 1).padStart(3, '0')}`,
    name: m.name,
    brand: m.brand,
    category: 'Smartphones',
    category_slug: 'smartphones',
    price: m.price,
    original_price: m.orig,
    description: `${m.name} offers top-tier smartphone technology with ${m.proc}, gorgeous ${m.disp}, and ${m.cam}. Backed by ${m.batt} battery life and running ${m.os}.`,
    image_url: getImg('smartphones', i),
    attributes: JSON.stringify({
      brand: m.brand,
      processor: m.proc,
      ram: m.ram,
      storage: m.storage,
      battery: m.batt,
      display: m.disp,
      camera: m.cam,
      os: m.os,
      connectivity: '5G, WiFi 6E/7, Bluetooth 5.3, NFC',
    }),
    rating: round(4.2 + (i % 8) * 0.1),
    review_count: 350 + (i * 87) % 3000,
    tags: `smartphone, 5g, ${m.brand.toLowerCase()}, mobile, tech`,
    stock_quantity: 25 + (i * 7) % 90,
    is_active: 'true',
    is_featured: (i % 5 === 0) ? 'true' : 'false',
  });
});

// 2. LAPTOPS (40 products)
const laptopBrands = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'Razer', 'MSI', 'Samsung'];
const laptopCPUs = ['Intel Core i7-13700H', 'Intel Core i9-13900H', 'AMD Ryzen 7 7840HS', 'AMD Ryzen 9 7940HS', 'Apple M3 Pro', 'Apple M3 Max', 'Apple M2 Air', 'Intel Core Ultra 7 155H'];
const laptopGPUs = ['NVIDIA RTX 4060 8GB', 'NVIDIA RTX 4070 8GB', 'NVIDIA RTX 4080 12GB', 'Intel Iris Xe', 'AMD Radeon 780M', 'M3 Pro 14-Core GPU', 'Intel Arc Graphics'];

for (let i = 0; i < 40; i++) {
  const brand = laptopBrands[i % laptopBrands.length];
  const cpu = laptopCPUs[i % laptopCPUs.length];
  const gpu = laptopGPUs[i % laptopGPUs.length];
  const ram = (i % 3 === 0) ? '32 GB DDR5' : (i % 2 === 0) ? '16 GB DDR5' : '8 GB LPDDR5';
  const storage = (i % 3 === 0) ? '1 TB NVMe SSD' : (i % 2 === 0) ? '512 GB SSD' : '2 TB PCIe 4.0 SSD';
  const size = (i % 4 === 0) ? '14-inch' : (i % 4 === 1) ? '15.6-inch' : (i % 4 === 2) ? '16-inch' : '13.3-inch';
  const price = round(649.99 + (i * 47.5) % 1900);
  const orig = round(price * 1.15);

  let modelName = `${brand} `;
  if (brand === 'Apple') {
    const chip = (i % 2 === 0) ? 'MacBook Pro 14" M3' : (i % 3 === 0) ? 'MacBook Pro 16" M3 Max' : 'MacBook Air 15" M2';
    modelName = chip;
  } else if (brand === 'Dell') {
    modelName += (i % 2 === 0) ? `XPS 15 (${size})` : `Inspiron 16 Plus`;
  } else if (brand === 'Lenovo') {
    modelName += (i % 2 === 0) ? `ThinkPad X1 Carbon Gen 11` : `Legion Pro 5i`;
  } else if (brand === 'ASUS') {
    modelName += (i % 2 === 0) ? `ROG Zephyrus G14` : `Zenbook 14 OLED`;
  } else if (brand === 'HP') {
    modelName += (i % 2 === 0) ? `Spectre x360 2-in-1` : `OMEN 16 Gaming Laptop`;
  } else if (brand === 'Acer') {
    modelName += (i % 2 === 0) ? `Predator Helios 16` : `Swift Go 14 OLED`;
  } else if (brand === 'Microsoft') {
    modelName += (i % 2 === 0) ? `Surface Laptop 5` : `Surface Laptop Studio 2`;
  } else if (brand === 'Razer') {
    modelName += (i % 2 === 0) ? `Blade 15 Advanced Gaming` : `Blade 14 AMD Edition`;
  } else if (brand === 'MSI') {
    modelName += (i % 2 === 0) ? `Stealth 16 Studio` : `Katana 15 Gaming`;
  } else {
    modelName += `Galaxy Book4 Pro 360`;
  }

  allProducts.push({
    product_id: `TECH-LP-${String(i + 1).padStart(3, '0')}`,
    name: `${modelName} - ${ram}, ${storage}`,
    brand,
    category: 'Laptops',
    category_slug: 'laptops',
    price,
    original_price: orig,
    description: `High-powered ${brand} laptop engineered with ${cpu}, ${gpu}, ${ram}, and ${storage} blazing-fast storage. Crystal-clear ${size} display for work, creation, and gaming.`,
    image_url: getImg('laptops', i),
    attributes: JSON.stringify({
      brand,
      processor: cpu,
      ram,
      storage,
      graphics: gpu,
      display_size: size,
      display_resolution: (i % 2 === 0) ? '2880 x 1800 OLED' : '1920 x 1200 IPS',
      battery_life: `${10 + (i % 8)} hours`,
      weight: `${round(1.2 + (i % 6) * 0.25)} kg`,
      os: brand === 'Apple' ? 'macOS Sonoma' : 'Windows 11 Pro',
    }),
    rating: round(4.3 + (i % 7) * 0.1),
    review_count: 120 + (i * 63) % 1800,
    tags: `laptop, ${brand.toLowerCase()}, ultrabook, computer, work, gaming`,
    stock_quantity: 12 + (i * 5) % 45,
    is_active: 'true',
    is_featured: (i % 6 === 0) ? 'true' : 'false',
  });
}

// 3. TABLETS (40 products)
const tabletMakers = ['Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Xiaomi', 'OnePlus', 'Amazon', 'Google'];
for (let i = 0; i < 40; i++) {
  const brand = tabletMakers[i % tabletMakers.length];
  let name = '';
  let disp = '';
  let proc = '';
  let storage = (i % 3 === 0) ? '256 GB' : (i % 2 === 0) ? '128 GB' : '64 GB';

  if (brand === 'Apple') {
    name = (i % 4 === 0) ? `iPad Pro 12.9" M2 (${storage})` : (i % 4 === 1) ? `iPad Air 10.9" M1 (${storage})` : (i % 4 === 2) ? `iPad 10th Gen (${storage})` : `iPad Mini 6 (${storage})`;
    disp = 'Liquid Retina Display with True Tone';
    proc = 'Apple M2 / A14 Bionic';
  } else if (brand === 'Samsung') {
    name = (i % 3 === 0) ? `Galaxy Tab S9 Ultra (${storage})` : (i % 3 === 1) ? `Galaxy Tab S9+ (${storage})` : `Galaxy Tab S9 FE (${storage})`;
    disp = 'Dynamic AMOLED 2X 120Hz';
    proc = 'Snapdragon 8 Gen 2';
  } else if (brand === 'Microsoft') {
    name = `Surface Pro 9 Tablet-PC (${storage})`;
    disp = '13" PixelSense Flow Touchscreen';
    proc = 'Intel Core i7-1255U';
  } else if (brand === 'Lenovo') {
    name = `Lenovo Tab P12 Pro (${storage})`;
    disp = '12.6" 2K AMOLED 120Hz';
    proc = 'Snapdragon 870';
  } else if (brand === 'Xiaomi') {
    name = `Xiaomi Pad 6 Max 14 (${storage})`;
    disp = '14" 2.8K 120Hz Display';
    proc = 'Snapdragon 8+ Gen 1';
  } else if (brand === 'OnePlus') {
    name = `OnePlus Pad (${storage})`;
    disp = '11.61" 144Hz 7:5 ReadFit Display';
    proc = 'Dimensity 9000';
  } else if (brand === 'Amazon') {
    name = `Amazon Fire Max 11 (${storage})`;
    disp = '11" 2.4K Vivid Screen';
    proc = 'Octa-core 2.2 GHz';
  } else {
    name = `Google Pixel Tablet with Speaker Dock (${storage})`;
    disp = '10.95" LCD Display';
    proc = 'Google Tensor G2';
  }

  const price = round(199.99 + (i * 37) % 1100);
  allProducts.push({
    product_id: `TECH-TB-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Tablets',
    category_slug: 'tablets',
    price,
    original_price: round(price * 1.18),
    description: `Ultra-slim ${brand} tablet with ${disp}, powerful ${proc}, and ${storage} storage. Perfect for digital artists, note-taking, and entertainment.`,
    image_url: getImg('tablets', i),
    attributes: JSON.stringify({
      brand,
      display: disp,
      processor: proc,
      storage,
      ram: (i % 2 === 0) ? '8 GB' : '12 GB',
      connectivity: 'Wi-Fi 6E, Bluetooth 5.3',
      battery_life: `${10 + (i % 5)} hours`,
      stylus_support: 'Active Stylus / Pen Compatible',
      os: brand === 'Apple' ? 'iPadOS 17' : brand === 'Microsoft' ? 'Windows 11' : 'Android 14',
    }),
    rating: round(4.1 + (i % 8) * 0.1),
    review_count: 85 + (i * 44) % 1200,
    tags: `tablet, ${brand.toLowerCase()}, ipad, android, touch, media`,
    stock_quantity: 18 + (i * 4) % 60,
    is_active: 'true',
    is_featured: (i % 7 === 0) ? 'true' : 'false',
  });
}

// 4. HEADPHONES & EARBUDS (40 products)
const audioBrands = ['Sony', 'Apple', 'Bose', 'Sennheiser', 'JBL', 'Samsung', 'Skullcandy', 'Audio-Technica', 'Beats', 'Jabra', 'Marshall', 'Anker Soundcore'];
const audioTypes = ['Over-ear ANC Headphones', 'True Wireless Earbuds', 'Sport Earbuds', 'Studio Monitor Headphones', 'Open-ear Wireless'];

for (let i = 0; i < 40; i++) {
  const brand = audioBrands[i % audioBrands.length];
  const type = audioTypes[i % audioTypes.length];
  const price = round(49.99 + (i * 12.5) % 400);
  let name = '';

  if (brand === 'Sony') {
    name = (i % 3 === 0) ? 'Sony WH-1000XM5 Wireless ANC' : (i % 3 === 1) ? 'Sony WF-1000XM5 Noise Canceling Earbuds' : 'Sony WH-CH720N Wireless Over-Ear';
  } else if (brand === 'Apple') {
    name = (i % 3 === 0) ? 'Apple AirPods Max Over-Ear' : (i % 3 === 1) ? 'Apple AirPods Pro (2nd Gen) USB-C' : 'Apple AirPods (3rd Gen) with MagSafe';
  } else if (brand === 'Bose') {
    name = (i % 2 === 0) ? 'Bose QuietComfort Ultra Headphones' : 'Bose QuietComfort Earbuds II';
  } else if (brand === 'Sennheiser') {
    name = (i % 2 === 0) ? 'Sennheiser Momentum 4 Wireless' : 'Sennheiser HD 660S2 Open-Back';
  } else if (brand === 'Beats') {
    name = (i % 2 === 0) ? 'Beats Studio Pro Wireless ANC' : 'Beats Fit Pro True Wireless';
  } else if (brand === 'JBL') {
    name = (i % 2 === 0) ? 'JBL Live 660NC Over-Ear' : 'JBL Tune 230NC TWS Earbuds';
  } else if (brand === 'Marshall') {
    name = (i % 2 === 0) ? 'Marshall Major IV On-Ear' : 'Marshall Motif II A.N.C.';
  } else {
    name = `${brand} Pro Sound ANC - ${type}`;
  }

  allProducts.push({
    product_id: `TECH-HP-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Headphones & Earbuds',
    category_slug: 'headphones-earbuds',
    price,
    original_price: round(price * 1.22),
    description: `Immerse in breathtaking audio with ${name}. Features active noise cancellation, custom-tuned dynamic drivers, crystal clear calling microphones, and ergonomic all-day comfort.`,
    image_url: getImg('headphones', i),
    attributes: JSON.stringify({
      brand,
      type,
      connectivity: 'Bluetooth 5.3 + 3.5mm Aux',
      battery_life: `${24 + (i % 36)} hours`,
      noise_cancellation: (i % 5 === 0) ? 'No - Pure Studio Sound' : 'Yes - Adaptive Hybrid ANC',
      driver_size: (type.includes('Earbuds')) ? '11mm Dynamic Driver' : '40mm Neodymium Driver',
      water_resistance: 'IPX4 / IPX5 Sweat & Water Resistant',
      microphone: 'Built-in 4-Mic Array with Beamforming',
      weight: `${180 + (i % 120)}g`,
    }),
    rating: round(4.3 + (i % 7) * 0.1),
    review_count: 240 + (i * 77) % 3500,
    tags: `audio, headphones, earbuds, wireless, anc, bluetooth, ${brand.toLowerCase()}`,
    stock_quantity: 30 + (i * 6) % 110,
    is_active: 'true',
    is_featured: (i % 6 === 0) ? 'true' : 'false',
  });
}

// 5. SMARTWATCHES (40 products)
const watchBrands = ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Google', 'Amazfit', 'Fossil', 'OnePlus', 'Noise', 'boAt'];
for (let i = 0; i < 40; i++) {
  const brand = watchBrands[i % watchBrands.length];
  const price = round(79.99 + (i * 18.2) % 750);
  let name = '';

  if (brand === 'Apple') {
    name = (i % 3 === 0) ? `Apple Watch Ultra 2 (49mm Titanium)` : (i % 3 === 1) ? `Apple Watch Series 9 (45mm GPS)` : `Apple Watch SE (44mm)`;
  } else if (brand === 'Samsung') {
    name = (i % 2 === 0) ? `Galaxy Watch 6 Classic (47mm LTE)` : `Galaxy Watch 6 (44mm Bluetooth)`;
  } else if (brand === 'Garmin') {
    name = (i % 3 === 0) ? `Garmin Epix Pro Gen 2 Sapphire` : (i % 3 === 1) ? `Garmin Forerunner 965 GPS` : `Garmin Venu 3 Fitness`;
  } else if (brand === 'Google') {
    name = `Google Pixel Watch 2 (LTE + Bluetooth)`;
  } else if (brand === 'Fitbit') {
    name = (i % 2 === 0) ? `Fitbit Sense 2 Health Smartwatch` : `Fitbit Versa 4 Fitness Tracker`;
  } else if (brand === 'Amazfit') {
    name = (i % 2 === 0) ? `Amazfit GTR 4 Classic Smartwatch` : `Amazfit T-Rex 2 Rugged Military`;
  } else {
    name = `${brand} Pulse Active Pro Smartwatch`;
  }

  allProducts.push({
    product_id: `TECH-SW-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Smartwatches',
    category_slug: 'smartwatches',
    price,
    original_price: round(price * 1.2),
    description: `Track your health, workouts, and stay connected with ${name}. Features 24/7 heart rate monitoring, SpO2, sleep tracking, GPS navigation, and brilliant always-on display.`,
    image_url: getImg('smartwatches', i),
    attributes: JSON.stringify({
      brand,
      display: 'AMOLED Always-On Sapphire Glass',
      battery_life: `${2 + (i % 14)} days`,
      connectivity: 'GPS, Bluetooth 5.3, Wi-Fi, NFC',
      water_resistance: '50m / 5ATM Water Resistant',
      health_sensors: 'Optical Heart Rate, SpO2, ECG, Skin Temp, Accelerometer',
      compatibility: brand === 'Apple' ? 'iOS only' : 'Android & iOS',
      os: brand === 'Apple' ? 'watchOS 10' : brand === 'Samsung' ? 'Wear OS 4' : 'Custom RTOS',
    }),
    rating: round(4.2 + (i % 8) * 0.1),
    review_count: 95 + (i * 51) % 2200,
    tags: `smartwatch, fitness, wearable, health, tracker, ${brand.toLowerCase()}`,
    stock_quantity: 20 + (i * 4) % 75,
    is_active: 'true',
    is_featured: (i % 5 === 0) ? 'true' : 'false',
  });
}

// 6. CAMERAS (40 products)
const cameraBrands = ['Sony', 'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'DJI', 'Panasonic Lumix', 'Leica'];
for (let i = 0; i < 40; i++) {
  const brand = cameraBrands[i % cameraBrands.length];
  const price = round(349.99 + (i * 68) % 3200);
  let name = '';
  let sensor = '';
  let video = '';

  if (brand === 'Sony') {
    name = (i % 3 === 0) ? 'Sony Alpha A7 IV Full-Frame Mirrorless' : (i % 3 === 1) ? 'Sony Alpha A6700 APS-C Creator' : 'Sony ZV-E1 Full-Frame Vlogging Camera';
    sensor = '33MP Full-Frame Exmor R CMOS';
    video = '4K 60p 10-Bit 4:2:2 All-Intra';
  } else if (brand === 'Canon') {
    name = (i % 3 === 0) ? 'Canon EOS R6 Mark II Mirrorless' : (i % 3 === 1) ? 'Canon EOS R8 Full-Frame' : 'Canon PowerShot V10 Pocket Vlogging';
    sensor = '24.2MP Full-Frame Dual Pixel CMOS AF II';
    video = '4K 60p Uncropped 6K Oversampling';
  } else if (brand === 'Nikon') {
    name = (i % 2 === 0) ? 'Nikon Z8 Professional Mirrorless' : 'Nikon Zfc Retro Classic Mirrorless';
    sensor = '45.7MP Stacked CMOS Sensor';
    video = '8.3K 60p RAW In-Camera';
  } else if (brand === 'Fujifilm') {
    name = (i % 2 === 0) ? 'Fujifilm X-T5 Mirrorless Camera' : 'Fujifilm X100VI Digital Camera';
    sensor = '40.2MP X-Trans CMOS 5 HR';
    video = '6.2K 30p 10-bit Internal';
  } else if (brand === 'GoPro') {
    name = (i % 2 === 0) ? 'GoPro HERO 12 Black Action Camera' : 'GoPro MAX 360 Waterproof Action Cam';
    sensor = '27MP High-Performance Sensor';
    video = '5.3K 60fps HyperSmooth 6.0';
  } else if (brand === 'DJI') {
    name = (i % 2 === 0) ? 'DJI Osmo Pocket 3 Creator Combo' : 'DJI Osmo Action 4 4K Camera';
    sensor = '1-inch CMOS Sensor';
    video = '4K 120fps with 10-bit D-Log M';
  } else if (brand === 'Panasonic Lumix') {
    name = 'Panasonic Lumix S5 IIX Hybrid Mirrorless';
    sensor = '24.2MP Full-Frame Phase Hybrid AF';
    video = '6K 30p Open Gate Recording';
  } else {
    name = 'Leica Q3 Luxury Full-Frame Compact Camera';
    sensor = '60MP BSI CMOS Sensor';
    video = '8K 30p Recording';
  }

  allProducts.push({
    product_id: `TECH-CM-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Cameras',
    category_slug: 'cameras',
    price,
    original_price: round(price * 1.15),
    description: `Elevate your visual storytelling with ${name}. Boasts ${sensor}, ultra-smooth ${video}, state-of-the-art optical image stabilization, and lightning-fast autofocus.`,
    image_url: getImg('cameras', i),
    attributes: JSON.stringify({
      brand,
      sensor,
      video,
      iso_range: '100-51,200 (Expandable to 204,800)',
      stabilization: '5-Axis In-Body Image Stabilization (IBIS)',
      connectivity: 'Wi-Fi 5GHz, Bluetooth 5.2, USB-C, HDMI',
      lens_mount: brand === 'Sony' ? 'Sony E-Mount' : brand === 'Canon' ? 'Canon RF' : brand === 'Nikon' ? 'Nikon Z' : 'Integrated High-Precision Lens',
      weather_sealing: 'Dust and Moisture Resistant Magnesium Alloy Body',
    }),
    rating: round(4.4 + (i % 6) * 0.1),
    review_count: 60 + (i * 38) % 1500,
    tags: `camera, mirrorless, 4k, photography, video, ${brand.toLowerCase()}`,
    stock_quantity: 8 + (i * 3) % 35,
    is_active: 'true',
    is_featured: (i % 6 === 0) ? 'true' : 'false',
  });
}

// 7. COMPUTER ACCESSORIES (40 products)
const accBrands = ['Logitech', 'Keychron', 'LG', 'Samsung', 'Anker', 'CalDigit', 'Razer', 'Corsair', 'SanDisk', 'Elgato'];
for (let i = 0; i < 40; i++) {
  const brand = accBrands[i % accBrands.length];
  const price = round(29.99 + (i * 14.8) % 650);
  let name = '';
  let type = '';

  if (brand === 'Logitech') {
    const opts = ['MX Master 3S Wireless Mouse', 'MX Keys S Wireless Keyboard', 'Brio 4K Ultra HD Webcam', 'Zone Wireless 2 Headset'];
    name = `Logitech ${opts[i % opts.length]}`;
    type = 'Peripherals';
  } else if (brand === 'Keychron') {
    const opts = ['Q1 Pro Wireless Custom Mechanical Keyboard', 'K2 Version 2 Hot-Swappable', 'V6 QMK Custom Full-Size'];
    name = `Keychron ${opts[i % opts.length]}`;
    type = 'Mechanical Keyboard';
  } else if (brand === 'LG') {
    const opts = ['UltraFine 27" 4K UHD Monitor', 'UltraGear 34" Curved QHD 160Hz', 'DualUp 28" Ergonomic Monitor'];
    name = `LG ${opts[i % opts.length]}`;
    type = 'Monitor';
  } else if (brand === 'Samsung') {
    const opts = ['ViewFinity S9 27" 5K Monitor', '990 PRO 2TB NVMe PCIe 4.0 SSD', 'T7 Shield 2TB Portable SSD'];
    name = `Samsung ${opts[i % opts.length]}`;
    type = 'Monitor / Storage';
  } else if (brand === 'Anker') {
    const opts = ['737 Power Bank (PowerCore 24K)', 'Prime 100W GaN Wall Charger', '575 USB-C Docking Station 13-in-1'];
    name = `Anker ${opts[i % opts.length]}`;
    type = 'Charging & Docks';
  } else if (brand === 'CalDigit') {
    name = 'CalDigit TS4 Thunderbolt 4 18-Port Dock';
    type = 'Thunderbolt 4 Dock';
  } else if (brand === 'SanDisk') {
    name = (i % 2 === 0) ? 'SanDisk Extreme PRO 2TB Portable SSD' : 'SanDisk 1TB Extreme microSDXC UHS-I';
    type = 'Storage';
  } else if (brand === 'Elgato') {
    name = (i % 2 === 0) ? 'Elgato Stream Deck MK.2 (15 LCD Keys)' : 'Elgato Facecam Pro 4K60 Webcam';
    type = 'Creator Gear';
  } else if (brand === 'Corsair') {
    name = 'Corsair K70 RGB PRO Mechanical Keyboard';
    type = 'Keyboard';
  } else {
    name = 'Razer DeathAdder V3 Pro Wireless Mouse';
    type = 'Mouse';
  }

  allProducts.push({
    product_id: `TECH-AC-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Computer Accessories',
    category_slug: 'computer-accessories',
    price,
    original_price: round(price * 1.25),
    description: `Upgrade your workspace and workstation efficiency with ${name}. Premium build quality, plug-and-play compatibility, and enterprise-grade reliability.`,
    image_url: getImg('accessories', i),
    attributes: JSON.stringify({
      brand,
      accessory_type: type,
      connectivity: 'USB-C, Thunderbolt, Bluetooth 5.3, 2.4GHz Wireless',
      compatibility: 'Windows 11, macOS Sonoma, Linux, iPadOS',
      warranty: '2 Years Manufacturer Warranty',
    }),
    rating: round(4.3 + (i % 7) * 0.1),
    review_count: 140 + (i * 62) % 4000,
    tags: `accessory, pc, mac, peripheral, desk, office, ${brand.toLowerCase()}`,
    stock_quantity: 35 + (i * 7) % 120,
    is_active: 'true',
    is_featured: (i % 5 === 0) ? 'true' : 'false',
  });
}

// 8. GAMING PRODUCTS (40 products)
const gameBrands = ['Sony', 'Microsoft', 'Nintendo', 'Valve', 'Razer', 'SteelSeries', 'Corsair', 'ASUS ROG', 'HyperX', 'Meta'];
for (let i = 0; i < 40; i++) {
  const brand = gameBrands[i % gameBrands.length];
  const price = round(59.99 + (i * 17.5) % 600);
  let name = '';
  let platform = '';

  if (brand === 'Sony') {
    const opts = ['PlayStation 5 Console (Slim Disc Edition)', 'DualSense Edge Wireless Controller', 'PlayStation VR2 Horizon VR Headset', 'DualSense Wireless Controller Midnight Black'];
    name = `Sony ${opts[i % opts.length]}`;
    platform = 'PlayStation 5 / PC';
  } else if (brand === 'Microsoft') {
    const opts = ['Xbox Series X 1TB Gaming Console', 'Xbox Elite Wireless Controller Series 2', 'Xbox Wireless Controller Robot White', 'Xbox Wireless Headset Dolby Atmos'];
    name = `Microsoft ${opts[i % opts.length]}`;
    platform = 'Xbox Series X/S / Windows PC';
  } else if (brand === 'Nintendo') {
    const opts = ['Nintendo Switch OLED Model Mario Red', 'Nintendo Switch Pro Controller', 'Joy-Con Pair Pastel Green/Pink'];
    name = `Nintendo ${opts[i % opts.length]}`;
    platform = 'Nintendo Switch';
  } else if (brand === 'Valve') {
    name = (i % 2 === 0) ? 'Steam Deck OLED 512GB Handheld Gaming' : 'Steam Deck OLED 1TB Top Tier';
    platform = 'SteamOS / PC Handheld';
  } else if (brand === 'Meta') {
    name = (i % 2 === 0) ? 'Meta Quest 3 128GB Mixed Reality Headset' : 'Meta Quest 3 512GB All-in-One VR';
    platform = 'Standalone VR / PC VR';
  } else if (brand === 'Razer') {
    const opts = ['Wolverine V2 Pro Wireless Controller', 'BlackWidow V4 Pro Mechanical Keyboard', 'Viper V2 Pro Ultralight Mouse', 'BlackShark V2 Pro Wireless Headset'];
    name = `Razer ${opts[i % opts.length]}`;
    platform = 'PC / PS5 / Xbox';
  } else if (brand === 'SteelSeries') {
    const opts = ['Arctis Nova Pro Wireless Headset', 'Apex Pro TKL Mechanical Keyboard', 'Aerox 3 Wireless Superlight Mouse'];
    name = `SteelSeries ${opts[i % opts.length]}`;
    platform = 'PC / Console';
  } else if (brand === 'ASUS ROG') {
    name = (i % 2 === 0) ? 'ASUS ROG Ally Z1 Extreme Handheld' : 'ROG Swift 32" 4K 240Hz OLED Gaming Monitor';
    platform = 'Windows 11 PC Gaming';
  } else if (brand === 'HyperX') {
    name = (i % 2 === 0) ? 'HyperX Cloud III Wireless Gaming Headset' : 'HyperX QuadCast S RGB USB Microphone';
    platform = 'PC / PS5 / PS4';
  } else {
    name = 'Corsair HS80 RGB Wireless Gaming Headset';
    platform = 'PC / Mac / PS5';
  }

  allProducts.push({
    product_id: `TECH-GM-${String(i + 1).padStart(3, '0')}`,
    name,
    brand,
    category: 'Gaming',
    category_slug: 'gaming',
    price,
    original_price: round(price * 1.18),
    description: `Immerse into high-frame-rate next-gen gaming with ${name}. Designed for esports athletes and enthusiasts demanding low latency, precision control, and ergonomic endurance.`,
    image_url: getImg('gaming', i),
    attributes: JSON.stringify({
      brand,
      platform,
      connectivity: '2.4GHz Ultra-Low Latency, Bluetooth 5.3, USB-C',
      haptic_feedback: 'Precision Haptic Actuators / Dual Rumble Motors',
      audio_support: 'Dolby Atmos, Tempest 3D Audio, Spatial Surround',
      battery_life: `${15 + (i % 25)} hours (rechargeable)`,
    }),
    rating: round(4.4 + (i % 6) * 0.1),
    review_count: 310 + (i * 92) % 4500,
    tags: `gaming, console, controller, headset, esport, ${brand.toLowerCase()}`,
    stock_quantity: 15 + (i * 5) % 65,
    is_active: 'true',
    is_featured: (i % 5 === 0) ? 'true' : 'false',
  });
}

console.log(`Total generated products: ${allProducts.length}`);

// Convert to Worksheet and Workbook using xlsx
const ws = xlsx.utils.json_to_sheet(allProducts);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Products');

// Also create a Categories sheet
const wsCat = xlsx.utils.json_to_sheet(categories);
xlsx.utils.book_append_sheet(wb, wsCat, 'Categories');

// Output paths
const outputDir = path.join(__dirname);
const xlsxPath = path.join(outputDir, 'products_catalogue.xlsx');
const csvPath = path.join(outputDir, 'products_catalogue.csv');
const jsonPath = path.join(outputDir, 'products_catalogue.json');

xlsx.writeFile(wb, xlsxPath);
console.log(`✅ Successfully generated Excel file: ${xlsxPath}`);

// Also export as CSV for convenience
const csvContent = xlsx.utils.sheet_to_csv(ws);
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`✅ Successfully generated CSV file: ${csvPath}`);

// Also export as JSON for fast access & offline resilience
fs.writeFileSync(jsonPath, JSON.stringify(allProducts, null, 2), 'utf8');
console.log(`✅ Successfully generated JSON file: ${jsonPath}`);
