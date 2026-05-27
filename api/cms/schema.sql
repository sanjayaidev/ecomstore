-- CMS Tables for Homepage Management

-- Hero Sliders/Banners
CREATE TABLE IF NOT EXISTS cms_hero_sliders (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  image_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  background_color VARCHAR(50) DEFAULT '#f8f9fa',
  text_color VARCHAR(50) DEFAULT '#000000',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories for Homepage
CREATE TABLE IF NOT EXISTS cms_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon_emoji VARCHAR(10),
  image_url VARCHAR(500),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offer/Promotional Banners
CREATE TABLE IF NOT EXISTS cms_offer_banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  offer_text VARCHAR(100),
  image_url VARCHAR(500),
  gradient_start VARCHAR(50) DEFAULT '#667eea',
  gradient_end VARCHAR(50) DEFAULT '#764ba2',
  cta_text VARCHAR(100),
  cta_link VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Sections (Featured, Trending, etc.)
CREATE TABLE IF NOT EXISTS cms_product_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  section_type VARCHAR(50) DEFAULT 'products',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trust Features
CREATE TABLE IF NOT EXISTS cms_trust_features (
  id SERIAL PRIMARY KEY,
  icon_emoji VARCHAR(10) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter Settings
CREATE TABLE IF NOT EXISTS cms_newsletter_settings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'Subscribe to Our Newsletter',
  subtitle TEXT DEFAULT 'Get latest updates and exclusive offers',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order) VALUES
('Summer Collection 2024', 'Discover the latest trends in ethnic wear', '/images/banner1.jpg', 'Shop Now', '/products', '#f0f9ff', '#1e3a8a', 0),
('Exclusive Offers', 'Up to 50% off on selected items', '/images/banner2.jpg', 'View Deals', '/offers', '#fef2f2', '#991b1b', 1),
('New Arrivals', 'Fresh styles every week', '/images/banner3.jpg', 'Explore', '/new-arrivals', '#f0fdf4', '#166534', 2);

INSERT INTO cms_categories (name, slug, icon_emoji, description, display_order) VALUES
('Sarees', 'saree', '👘', 'Traditional elegance', 0),
('Kurtis', 'kurti', '👗', 'Comfortable & stylish', 1),
('Dresses', 'dress', '👚', 'Modern fashion', 2),
('Tops', 'top', '👕', 'Casual wear', 3),
('Bottoms', 'bottoms', '👖', 'Perfect fits', 4),
('Accessories', 'accessories', '👜', 'Complete your look', 5);

INSERT INTO cms_offer_banners (title, subtitle, offer_text, gradient_start, gradient_end, cta_text, cta_link, display_order) VALUES
('Flash Sale', 'Limited time offer', '50% OFF', '#667eea', '#764ba2', 'Grab Deal', '/flash-sale', 0),
('Free Shipping', 'On orders above ₹999', 'FREE DELIVERY', '#f093fb', '#f5576c', 'Shop Now', '/', 1),
('New User Offer', 'First purchase discount', '₹200 OFF', '#4facfe', '#00f2fe', 'Claim Now', '/register', 2);

INSERT INTO cms_product_sections (section_key, title, subtitle, section_type, display_order, config) VALUES
('featured', 'Featured Products', 'Handpicked for you', 'products', 0, '{"limit": 8}'),
('trending', 'Trending Now', 'What everyone is buying', 'products', 1, '{"limit": 8}'),
('new_arrivals', 'New Arrivals', 'Latest additions', 'products', 2, '{"limit": 8}');

INSERT INTO cms_trust_features (icon_emoji, title, description, display_order) VALUES
('🚚', 'Free Shipping', 'On orders above ₹999', 0),
('↩️', 'Easy Returns', '30 days return policy', 1),
('🔒', 'Secure Payment', '100% secure transactions', 2),
('💬', '24/7 Support', 'Always here to help', 3);

INSERT INTO cms_newsletter_settings (title, subtitle) VALUES
('Subscribe to Our Newsletter', 'Get latest updates and exclusive offers delivered to your inbox');
