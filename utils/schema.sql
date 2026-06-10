-- Enhanced E-commerce Database Schema

-- Existing tables (products, orders, order_items, customers) assumed to exist

-- COUPONS & DISCOUNTS
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'buy_x_get_y', 'bundle'
  discount_value DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER DEFAULT NULL,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  applicable_categories TEXT[], -- NULL means all categories
  applicable_products INTEGER[], -- NULL means all products
  buy_quantity INTEGER DEFAULT 0, -- for buy X get Y
  get_quantity INTEGER DEFAULT 0,
  bundle_products JSONB, -- for bundle deals [{product_id, quantity}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ABANDONED CARTS
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  cart_items JSONB NOT NULL, -- [{product_id, quantity, size, price}]
  subtotal DECIMAL(10,2),
  recovery_email_sent BOOLEAN DEFAULT false,
  recovery_email_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP,
  converted_to_order_id INTEGER,
  status VARCHAR(20) DEFAULT 'active', -- active, recovered, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);

-- COLLECTIONS (Product Groups)
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- COLLECTION-PRODUCT MAPPING
CREATE TABLE IF NOT EXISTS collection_products (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- LAYOUT SECTIONS (for dynamic page builder)
CREATE TABLE IF NOT EXISTS layout_sections (
  id SERIAL PRIMARY KEY,
  section_type VARCHAR(50) NOT NULL, -- hero_slider, categories, featured_products, banners, newsletter, custom_html
  section_name VARCHAR(100),
  config JSONB NOT NULL, -- section-specific configuration
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  page_location VARCHAR(50) DEFAULT 'homepage', -- homepage, product_page, collection_page
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WEBHOOKS & INTEGRATIONS
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events TEXT[] NOT NULL, -- ['order.created', 'order.completed', 'product.updated']
  secret_key VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WEBHOOK LOGS
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CART RECOVERY TEMPLATES
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(50) UNIQUE NOT NULL, -- abandoned_cart_1hr, abandoned_cart_24hr
  subject VARCHAR(255),
  body_html TEXT,
  body_text TEXT,
  variables JSONB, -- available template variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ANALYTICS TRACKING
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(100),
  customer_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON abandoned_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_layout_sections_active ON layout_sections(is_active, page_location, display_order);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);
