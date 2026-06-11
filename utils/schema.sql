-- E-commerce Enhanced Features Schema

-- 1. Abandoned Carts
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id SERIAL PRIMARY KEY,
    cart_id VARCHAR(100) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    user_id INT,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    recovered BOOLEAN DEFAULT FALSE,
    recovery_email_sent BOOLEAN DEFAULT FALSE,
    recovery_email_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Coupons & Discounts
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y', 'bundle')),
    value DECIMAL(10,2) NOT NULL,
    min_purchase_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit INT,
    usage_count INT DEFAULT 0,
    per_customer_limit INT DEFAULT 1,
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    applicable_collections INT[],
    applicable_products INT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Layout Sections (Dynamic Editor)
CREATE TABLE IF NOT EXISTS layout_sections (
    id SERIAL PRIMARY KEY,
    section_id VARCHAR(50) UNIQUE NOT NULL,
    page_name VARCHAR(50) DEFAULT 'home',
    type VARCHAR(50) NOT NULL,
    order_index INT DEFAULT 0,
    settings JSONB DEFAULT '{}',
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Webhooks (Custom Integrations)
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Collections
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order VARCHAR(20) DEFAULT 'manual',
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_products (
    id SERIAL PRIMARY KEY,
    collection_id INT REFERENCES collections(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, product_id)
);

-- 6. CMS Tables
CREATE TABLE IF NOT EXISTS cms_hero_sliders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    subtitle TEXT,
    image_url TEXT,
    cta_text VARCHAR(50),
    cta_link VARCHAR(255),
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    image_url TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_offer_banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    offer_text TEXT,
    image_url TEXT,
    link_url VARCHAR(255),
    bg_color VARCHAR(7),
    text_color VARCHAR(7),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_product_sections (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    section_type VARCHAR(50) DEFAULT 'grid',
    collection_id INT,
    product_ids INT[],
    max_products INT DEFAULT 8,
    bg_color VARCHAR(7),
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_trust_features (
    id SERIAL PRIMARY KEY,
    icon VARCHAR(100),
    title VARCHAR(100),
    description TEXT,
    display_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_newsletter_settings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) DEFAULT 'Subscribe to our newsletter',
    description TEXT,
    placeholder_text VARCHAR(100) DEFAULT 'Enter your email',
    button_text VARCHAR(50) DEFAULT 'Subscribe',
    bg_image_url TEXT,
    bg_color VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(user_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created ON abandoned_carts(created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_layout_sections_page ON layout_sections(page_name);
CREATE INDEX IF NOT EXISTS idx_layout_sections_order ON layout_sections(order_index);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collection_products_position ON collection_products(position);
CREATE INDEX IF NOT EXISTS idx_hero_sliders_active ON cms_hero_sliders(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_hero_sliders_order ON cms_hero_sliders(display_order);

-- Default slider data
INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active) VALUES
('New Collection 2026', 'Discover the latest trends in fashion', 'images/10.png', 'Shop Now', 'pages/products.html?sort=newest', '#667eea', '#ffffff', 1, TRUE),
('Summer Sale', 'Up to 70% off on selected items', 'images/11.png', 'Grab Deals', 'pages/products.html', '#f093fb', '#ffffff', 2, TRUE),
('Traditional Elegance', 'Beautiful sarees for every occasion', 'images/12.png', 'Explore Sarees', 'pages/products.html?category=saree', '#4facfe', '#ffffff', 3, TRUE)
ON CONFLICT DO NOTHING;
