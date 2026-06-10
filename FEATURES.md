# Enhanced E-commerce Features Documentation

This document describes the new enterprise-grade features added to your e-commerce platform.

## Table of Contents

1. [Abandoned Cart Recovery](#1-abandoned-cart-recovery)
2. [Discount & Coupon System](#2-discount--coupon-system)
3. [Dynamic Layout Editor (Shopify-like)](#3-dynamic-layout-editor-shopify-like)
4. [Custom Integrations (Webhooks)](#4-custom-integrations-webhooks)
5. [CSV Product Import](#5-csv-product-import)
6. [Collections Management](#6-collections-management)
7. [API Endpoints Reference](#7-api-endpoints-reference)

---

## 1. Abandoned Cart Recovery

Track users who add items to cart but don't complete checkout, and send automated recovery emails.

### Features
- Automatic cart tracking with session IDs
- Customer email capture
- Configurable recovery email templates
- Email scheduling (1 hour, 24 hours, 7 days after abandonment)
- Conversion tracking

### Database Tables
```sql
abandoned_carts - Stores abandoned cart data
email_templates - Recovery email templates
```

### API Endpoints

#### Track Abandoned Cart
```http
POST /api/abandoned-carts
Content-Type: application/json

{
  "session_id": "user-session-123",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "customer_phone": "+91 9876543210",
  "cart_items": [
    {"product_id": 1, "quantity": 2, "size": "M", "price": 999}
  ],
  "subtotal": 1998
}
```

#### Get Abandoned Carts
```http
GET /api/abandoned-carts?status=active
```

#### Send Recovery Email
```http
POST /api/cart-recovery/send-email
Content-Type: application/json

{
  "cart_id": 123,
  "template_key": "abandoned_cart_1hr"
}
```

#### Recover Cart (on checkout completion)
```http
PUT /api/abandoned-carts
Content-Type: application/json

{
  "id": 123,
  "order_id": 456
}
```

---

## 2. Discount & Coupon System

Create flexible discount campaigns with multiple discount types.

### Discount Types

1. **Percentage Discount**: `10% off entire order`
2. **Fixed Amount**: `₹200 off on orders above ₹999`
3. **Buy X Get Y**: `Buy 2 Get 1 Free`
4. **Bundle Deals**: `Special pricing when buying specific products together`

### Features
- Category-specific coupons
- Product-specific coupons
- Minimum order amount requirements
- Maximum discount caps
- Usage limits per coupon
- Validity period (start/end dates)
- Auto-apply based on cart contents

### Database Tables
```sql
coupons - Coupon codes and rules
```

### API Endpoints

#### Create Coupon
```http
POST /api/coupons
Content-Type: application/json

{
  "code": "SAVE20",
  "description": "20% off on Sarees",
  "discount_type": "percentage",
  "discount_value": 20,
  "min_order_amount": 500,
  "max_discount_amount": 500,
  "usage_limit": 100,
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_until": "2026-12-31T23:59:59Z",
  "applicable_categories": ["saree"],
  "is_active": true
}
```

#### Validate Coupon (at checkout)
```http
POST /api/coupon/validate
Content-Type: application/json

{
  "code": "SAVE20",
  "cart_items": [
    {"product_id": 1, "quantity": 2, "price": 999}
  ],
  "subtotal": 1998
}

Response:
{
  "valid": true,
  "coupon": { "code": "SAVE20", "discount_type": "percentage", "discount_value": 20 },
  "discount": 399.60,
  "final_total": 1598.40
}
```

#### Buy X Get Y Example
```json
{
  "code": "B2G1FREE",
  "discount_type": "buy_x_get_y",
  "buy_quantity": 2,
  "get_quantity": 1,
  "applicable_categories": ["kurti"]
}
```

#### Bundle Deal Example
```json
{
  "code": "COMBO500",
  "discount_type": "bundle",
  "discount_value": 500,
  "bundle_products": [
    {"product_id": 1, "quantity": 1},
    {"product_id": 5, "quantity": 1}
  ]
}
```

---

## 3. Dynamic Layout Editor (Shopify-like)

Drag-and-drop page builder for customizing homepage and other pages without coding.

### Section Types

1. **Hero Slider** - Full-width image sliders with CTAs
2. **Categories Grid** - Display product categories
3. **Featured Products** - Curated product selections
4. **Offer Banners** - Promotional banners
5. **Trust Features** - Shipping, returns, security icons
6. **Newsletter Signup** - Email subscription form
7. **Custom HTML** - Add custom code blocks

### Features
- Drag-and-drop reordering
- Per-section visibility controls
- Mobile-responsive settings
- Real-time preview
- Multiple page support (homepage, collection pages, product pages)

### Database Tables
```sql
layout_sections - Page sections and configurations
cms_sliders - Hero slider content
cms_homepage_categories - Category display settings
cms_banners - Offer banner content
cms_trust_features - Trust badges
cms_newsletter_settings - Newsletter configuration
```

### API Endpoints

#### Get Page Sections
```http
GET /api/layout-sections?page=homepage
```

#### Create Section
```http
POST /api/layout-sections
Content-Type: application/json

{
  "section_type": "hero_slider",
  "section_name": "Summer Sale Hero",
  "config": {
    "slides": [
      {
        "image_url": "/images/sale-banner.jpg",
        "title": "Summer Sale",
        "subtitle": "Up to 70% off",
        "cta_text": "Shop Now",
        "cta_link": "/products?sale=true",
        "gradient": "linear-gradient(135deg, #667eea, #764ba2)"
      }
    ],
    "autoPlay": true,
    "autoPlayDelay": 5000
  },
  "display_order": 1,
  "page_location": "homepage",
  "is_active": true
}
```

#### Reorder Sections
```http
POST /api/layout-sections/reorder
Content-Type: application/json

{
  "sections": [
    {"id": 1, "display_order": 0},
    {"id": 2, "display_order": 1},
    {"id": 3, "display_order": 2}
  ]
}
```

#### Update Section
```http
PUT /api/layout-sections/1
Content-Type: application/json

{
  "config": { ...new config... },
  "is_active": false
}
```

---

## 4. Custom Integrations (Webhooks)

Connect your store with external services like Zapier, Slack, Google Sheets, etc.

### Supported Events

- `order.created` - New order placed
- `order.pending` - Order status changed to pending
- `order.shipped` - Order marked as shipped
- `order.delivered` - Order delivered
- `order.cancelled` - Order cancelled
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `product.updated` - Product details changed
- `cart.abandoned` - Cart abandoned by customer

### Features
- HMAC signature verification for security
- Automatic retry on failure
- Webhook logs with response details
- Success/failure analytics

### Database Tables
```sql
webhooks - Webhook configurations
webhook_logs - Delivery attempt logs
```

### API Endpoints

#### Create Webhook
```http
POST /api/webhooks
Content-Type: application/json

{
  "name": "Order Notifications to Slack",
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "events": ["order.created", "order.paid"],
  "secret_key": "your-secret-key-for-signing"
}
```

#### Get All Webhooks
```http
GET /api/webhooks
```

#### Update Webhook
```http
PUT /api/webhooks/1
Content-Type: application/json

{
  "is_active": false
}
```

### Webhook Payload Example

```json
{
  "event": "order.created",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "id": 123,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "total": 2499,
    "status": "pending",
    "items": [...]
  }
}
```

### Signature Verification

Webhooks include an `X-Webhook-Signature` header. Verify it using:

```javascript
const crypto = require('crypto');
const expected = crypto
  .createHmac('sha256', 'your-secret-key')
  .update(JSON.stringify(payload))
  .digest('hex');
```

---

## 5. CSV Product Import

Bulk import products from CSV files.

### CSV Format

```csv
title,description,price,category,image_1,image_2,sizes,discount_price,stock,keywords
"Classic Cotton Saree","Beautiful handloom cotton saree",1299,"saree","/images/saree1.jpg","/images/saree1b.jpg","Free",999,50,"cotton,handloom,traditional"
"Designer Kurti","Embroidered party wear kurti",899,"kurti","/images/kurti1.jpg","/images/kurti1b.jpg","S|M|L",699,30,"party,embroidered,designer"
```

### Features
- Bulk import hundreds of products
- Update existing products (by SKU or title match)
- Error reporting with line numbers
- Automatic image URL validation
- Size parsing (pipe-separated: S|M|L)
- Keywords/tags support

### API Endpoint

```http
POST /api/import/csv
Content-Type: application/json

{
  "csv_data": "title,description,price,category...\nProduct 1,Desc 1,999,category1,...",
  "update_existing": true
}

Response:
{
  "imported": 45,
  "updated": 12,
  "errors": [
    {"line": 23, "error": "Missing required fields (title, price, category)"}
  ]
}
```

---

## 6. Collections Management

Create curated product collections independent of categories.

### Features
- Manual product selection
- Custom collection ordering
- Featured collections for homepage
- SEO-friendly slugs
- Collection-specific images

### Database Tables
```sql
collections - Collection definitions
collection_products - Product-to-collection mapping
```

### API Endpoints

#### Create Collection
```http
POST /api/collections
Content-Type: application/json

{
  "name": "Wedding Collection",
  "slug": "wedding-collection",
  "description": "Perfect outfits for wedding season",
  "image_url": "/images/wedding-banner.jpg",
  "is_featured": true,
  "display_order": 1
}
```

#### Get Collection with Products
```http
GET /api/collections?slug=wedding-collection
```

#### Add Products to Collection
```http
POST /api/collections/products
Content-Type: application/json

{
  "collection_id": 5,
  "product_ids": [1, 3, 7, 12],
  "action": "add"
}
```

#### Remove Products from Collection
```http
POST /api/collections/products
Content-Type: application/json

{
  "collection_id": 5,
  "product_ids": [3, 7],
  "action": "remove"
}
```

#### Update Collection
```http
PUT /api/collections/5
Content-Type: application/json

{
  "is_featured": false,
  "display_order": 3
}
```

---

## 7. API Endpoints Reference

### Complete Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products?id=1` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products` | Update product |
| DELETE | `/api/products` | Delete product |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders` | Update order status |
| GET | `/api/coupons` | List coupons |
| POST | `/api/coupons` | Create coupon |
| PUT | `/api/coupons` | Update coupon |
| POST | `/api/coupon/validate` | Validate coupon code |
| GET | `/api/abandoned-carts` | List abandoned carts |
| POST | `/api/abandoned-carts` | Track abandoned cart |
| PUT | `/api/abandoned-carts` | Recover cart |
| POST | `/api/cart-recovery/send-email` | Send recovery email |
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Create collection |
| PUT | `/api/collections/:id` | Update collection |
| POST | `/api/collections/products` | Manage collection products |
| GET | `/api/layout-sections` | Get page sections |
| POST | `/api/layout-sections` | Create section |
| PUT | `/api/layout-sections/:id` | Update section |
| POST | `/api/layout-sections/reorder` | Reorder sections |
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| PUT | `/api/webhooks/:id` | Update webhook |
| POST | `/api/import/csv` | Import products from CSV |
| GET | `/api/cms/sliders` | Get hero sliders |
| POST | `/api/cms/sliders` | Create slider |
| GET | `/api/cms/banners` | Get banners |
| POST | `/api/cms/banners` | Create banner |
| GET | `/api/cms/trust-features` | Get trust features |
| GET | `/api/cms/newsletter` | Get newsletter settings |

---

## Setup Instructions

### 1. Run Database Migrations

Execute the schema file to create new tables:

```bash
psql $DATABASE_URL < utils/schema.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```env
DATABASE_URL=your_database_url
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Deploy to Vercel

```bash
vercel deploy --prod
```

---

## Frontend Integration Examples

### Applying Coupon at Checkout

```javascript
async function applyCoupon(code, cartItems, subtotal) {
  const response = await fetch('/api/coupon/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, cart_items: cartItems, subtotal })
  });
  
  const result = await response.json();
  if (result.valid) {
    return { success: true, discount: result.discount, total: result.final_total };
  } else {
    throw new Error(result.error);
  }
}
```

### Tracking Abandoned Cart

```javascript
// In cartManager.js
function trackAbandonedCart() {
  const cart = getCart();
  if (cart.length === 0) return;
  
  // Only track if user has entered email
  const email = localStorage.getItem('customer_email');
  if (!email) return;
  
  fetch('/api/abandoned-carts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: getSessionId(),
      customer_email: email,
      cart_items: cart,
      subtotal: calculateSubtotal(cart)
    })
  });
}

// Track on page unload
window.addEventListener('beforeunload', trackAbandonedCart);
```

### Loading Dynamic Layout

```javascript
async function loadHomepageLayout() {
  const response = await fetch('/api/layout-sections?page=homepage');
  const sections = await response.json();
  
  sections.forEach(section => {
    renderSection(section.section_type, section.config);
  });
}

function renderSection(type, config) {
  switch(type) {
    case 'hero_slider':
      renderHeroSlider(config);
      break;
    case 'categories_grid':
      renderCategories(config);
      break;
    // ... other section types
  }
}
```

---

## Security Considerations

1. **Coupon Validation**: Always validate coupons server-side before applying discounts
2. **Webhook Signatures**: Verify HMAC signatures on incoming webhooks
3. **CSV Import**: Sanitize all CSV input, limit file size
4. **Rate Limiting**: Implement rate limiting on sensitive endpoints
5. **Authentication**: Protect admin endpoints with proper authentication

---

## Support

For issues or questions, check the API response error messages or review the database schema in `utils/schema.sql`.
