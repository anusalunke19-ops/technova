-- TECHNOVA PostgreSQL Schema

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id) ON DELETE SET NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled','refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2),
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_address JSONB,
  delivery_method VARCHAR(100),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','refunded')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100) UNIQUE,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id SERIAL PRIMARY KEY,
  product_id VARCHAR(50) UNIQUE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  threshold INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Low Stock Alerts
CREATE TABLE IF NOT EXISTS low_stock_alerts (
  alert_id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  current_stock INTEGER,
  threshold INTEGER,
  alert_status VARCHAR(20) DEFAULT 'active' CHECK (alert_status IN ('active','resolved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON low_stock_alerts(alert_status);

-- Trigger function for low stock alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity < NEW.threshold THEN
    -- Only insert if no active alert exists for this inventory item
    IF NOT EXISTS (
      SELECT 1 FROM low_stock_alerts
      WHERE inventory_id = NEW.inventory_id AND alert_status = 'active'
    ) THEN
      INSERT INTO low_stock_alerts (inventory_id, current_stock, threshold, alert_status)
      VALUES (NEW.inventory_id, NEW.stock_quantity, NEW.threshold, 'active');
    ELSE
      -- Update existing active alert with current stock
      UPDATE low_stock_alerts
      SET current_stock = NEW.stock_quantity
      WHERE inventory_id = NEW.inventory_id AND alert_status = 'active';
    END IF;
  ELSE
    -- Resolve any active alerts if stock is back above threshold
    UPDATE low_stock_alerts
    SET alert_status = 'resolved'
    WHERE inventory_id = NEW.inventory_id AND alert_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to inventory table
DROP TRIGGER IF EXISTS trg_low_stock ON inventory;
CREATE TRIGGER trg_low_stock
AFTER UPDATE OF stock_quantity ON inventory
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_updated ON inventory;
CREATE TRIGGER trg_inventory_updated
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
