# E-commerce Site Setup Guide

## Database Setup

Run this SQL in your Neon database to create all required tables:

```bash
psql $DATABASE_URL < utils/schema.sql
```

Or copy and run the contents of `utils/schema.sql` in your database client.

## API Endpoints

### Core APIs
- `GET/POST /api/products` - Product management
- `GET/POST/PUT/DELETE /api/orders` - Order management
- `POST /api/payment/create` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment signature
- `POST /api/payment/webhook` - Razorpay webhook handler

### Enhanced Features (NEW)
- `GET/POST/PUT/DELETE /api/coupons` - Coupon management
- `POST /api/coupons/validate` - Validate coupon code
- `GET/POST/PUT/DELETE /api/abandoned-carts` - Abandoned cart tracking
- `POST /api/abandoned-carts/send-recovery` - Send recovery email
- `GET/POST/PUT/DELETE /api/collections` - Collection management
- `POST /api/collections/products` - Add/remove products from collections
- `GET/POST/PUT/DELETE /api/layout-sections` - Dynamic page builder
- `POST /api/layout-sections/reorder` - Reorder sections (drag-drop)
- `GET/POST/PUT/DELETE /api/webhooks` - Webhook integrations
- `POST /api/csv-import` - Bulk product import via CSV

### CMS APIs
- `GET /api/cms/content` - Get all CMS content
- `GET/POST/PUT/DELETE /api/cms/sliders` - Hero sliders
- `GET/POST/PUT/DELETE /api/cms/categories` - Category cards
- `GET/POST/PUT/DELETE /api/cms/banners` - Offer banners
- `GET/POST/PUT/DELETE /api/cms/sections` - Product sections
- `GET/POST/PUT/DELETE /api/cms/trust-features` - Trust badges
- `GET/PUT /api/cms/newsletter` - Newsletter settings

## Environment Variables Required

```env
DATABASE_URL=postgresql://...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

## Features Overview

### 1. Abandoned Cart Recovery
- Tracks carts inactive for 30 days
- Sends automated recovery emails
- Converts recovered carts to orders
- Webhook triggers on cart abandonment

### 2. Advanced Coupons
- Percentage discounts
- Fixed amount discounts  
- Buy X Get Y deals
- Bundle offers
- Usage limits & validity periods
- Category/product restrictions

### 3. Dynamic Layout Editor
- Drag-and-drop sections
- Multiple page support (homepage, product, collection)
- Real-time configuration
- Section types: hero, categories, featured, banners, newsletter, custom HTML

### 4. Custom Integrations
- Webhook system with HMAC security
- Event-based triggers (order.created, order.completed, etc.)
- Success/failure logging
- Retry mechanism

### 5. CSV Product Import
- Bulk upload products
- Update existing by SKU/title
- Error reporting per line
- Supports sizes, discount prices, stock

### 6. Collections
- Create curated product groups
- Assign products to multiple collections
- Custom ordering within collections
- Featured collections for homepage

## Admin Panel Access

Login at `/admin/index.html`:
- Email: sanjay@mystore.com
- Password: sanjay@123

## Frontend Integration

```javascript
// Load products with filters
productRenderer.renderProducts('products-list', {
  category: 'saree',
  limit: 12,
  sort: 'newest'
});

// Add to cart
cartManager.addToCart({
  product_id: 1,
  title: 'Product Name',
  price: 999,
  quantity: 1,
  size: 'M'
});

// Validate coupon
fetch('/api/coupons/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'SAVE20',
    cart_items: [...],
    subtotal: 1999
  })
});
```
