# E-Commerce Platform - Complete Setup Guide

A full-featured e-commerce platform with PostgreSQL database, live visual editor, customer accounts, and custom integrations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Installation](#installation)
5. [Running the Application](#running-the-application)
6. [Features Overview](#features-overview)
7. [API Reference](#api-reference)
8. [Admin Panel](#admin-panel)
9. [Custom Integrations](#custom-integrations)

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud like Neon, Supabase, etc.)
- npm or yarn package manager

---

## Database Setup

### 1. Create PostgreSQL Database

```sql
CREATE DATABASE ecommerce_db;
```

### 2. Run Schema Migration

Execute the schema file to create all required tables:

```bash
psql -d ecommerce_db -f utils/schema.sql
```

Or copy and run the SQL from `utils/schema.sql` in your database client.

### 3. Create Products Table

The schema assumes a `products` table exists. Create it with:

```sql
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    image_1 TEXT,
    image_2 TEXT,
    sizes JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    discount_price DECIMAL(10,2),
    stock INT DEFAULT 0,
    sku VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_address TEXT,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cod',
    payment_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    size VARCHAR(20),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_id INT REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100),
    payload JSONB,
    response_status INT,
    response_body TEXT,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db

# Or for cloud providers:
# DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# Razorpay Payment Gateway (Optional)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# JWT Secret for Auth
JWT_SECRET=your-super-secret-jwt-key-change-this

# Admin Credentials
ADMIN_EMAIL=sanjay@mystore.com
ADMIN_PASSWORD=sanjay@123

# App Settings
PORT=3000
NODE_ENV=development
```

---

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Database Connection

```bash
node -e "require('./utils/db').query('SELECT NOW()', (err, res) => { console.log(err || res.rows[0]); process.exit(); })"
```

---

## Running the Application

### Development Mode

For local development, you can serve the static files:

```bash
# Using npx http-server
npx http-server -p 3000

# Or using Python
python -m http.server 3000
```

### Production Deployment (Vercel)

This project is configured for Vercel serverless deployment:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The API routes are located in `/api/index.js` and will be automatically deployed as serverless functions.

---

## Features Overview

### 1. Live Visual Editor (`/admin/live-editor.html`)

Shopify-style live page editor with:
- Real-time preview of your actual site
- Click-to-edit sections
- Drag-and-drop reordering
- Version history and rollback
- Page-specific layouts (Home, Product, Collection, Cart, Checkout)
- Publish/draft workflow

**Access:** Login to admin panel → Live Editor

### 2. Customer Account System (`/pages/account.html`)

Complete customer dashboard with:
- Profile management (edit name, email, phone, address)
- Order history with detailed view
- Order status tracking with visual timeline
- Exclusive offers section
- "You may also like" recommendations
- Password change functionality

**Access:** Customers can access at `/pages/account.html`

### 3. Custom Integrations (Webhooks)

Support for external integrations via webhooks:

**Available Events:**
- `order.created` - New order placed
- `order.paid` - Payment confirmed
- `order.shipped` - Order dispatched
- `order.cancelled` - Order cancelled
- `cart.abandoned` - Cart abandoned
- `product.created` - New product added
- `customer.registered` - New customer signup

**Configure Webhooks:**
1. Go to Admin Panel → Settings → Webhooks
2. Add webhook URL and select events
3. Optional: Set secret key for HMAC signature verification

**Example Webhook Payload:**
```json
{
  "event": "order.created",
  "timestamp": "2026-06-11T10:30:00Z",
  "data": {
    "order_id": 123,
    "customer_email": "customer@example.com",
    "total": 2999,
    "items": [...]
  }
}
```

### 4. Payment Integration

Razorpay payment gateway integration:
- Secure checkout flow
- Order creation and verification
- Webhook support for payment confirmation
- Support for UPI, Cards, Net Banking, Wallets

### 5. Admin Dashboard (`/admin/index.html`)

Complete admin panel with:
- Product management (CRUD operations)
- Order management with status updates
- Coupon/discount code management
- Layout section management
- Webhook configuration
- CSV import/export

**Login:** Use credentials from `.env.local` (default: `sanjay@mystore.com` / `sanjay@123`)

### 6. CMS Management (`/admin/cms-manager.html`)

Manage homepage content:
- Hero sliders
- Category banners
- Offer promotions
- Product sections
- Trust features
- Newsletter settings

---

## API Reference

Base URL: `/api`

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List all products |
| GET | `/products?id=1` | Get single product |
| GET | `/products?category=saree` | Filter by category |
| POST | `/products` | Create product |
| PUT | `/products` | Update product |
| DELETE | `/products?id=1` | Delete product |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List all orders |
| GET | `/orders?id=1` | Get order details |
| POST | `/orders` | Create order |
| PUT | `/orders` | Update order status |
| DELETE | `/orders?id=1` | Cancel order |

### Payment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payment/config` | Get Razorpay key |
| POST | `/payment/create` | Create payment order |
| POST | `/payment/verify` | Verify payment signature |
| POST | `/payment/webhook` | Razorpay webhook handler |

### Coupons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/coupons` | List coupons |
| POST | `/coupons` | Create coupon |
| PUT | `/coupons` | Update coupon |
| POST | `/coupons/validate` | Validate coupon code |

### Layout Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/layout?page=homepage` | Get page sections |
| POST | `/layout` | Create section |
| PUT | `/layout` | Update section |
| POST | `/layout/bulk` | Bulk save sections |
| POST | `/layout/reorder` | Reorder sections |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks` | List webhooks |
| POST | `/webhooks` | Create webhook |
| PUT | `/webhooks` | Update webhook |
| DELETE | `/webhooks` | Delete webhook |

### Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections` | List collections |
| GET | `/collections?slug=sarees` | Get collection with products |
| POST | `/collections` | Create collection |
| PUT | `/collections` | Update collection |

### CMS Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cms/sliders` | Get hero sliders |
| GET | `/cms/categories` | Get categories |
| GET | `/cms/offers` | Get offer banners |
| POST | `/cms/*` | Create CMS content |
| PUT | `/cms/*` | Update CMS content |

---

## Admin Panel

### Accessing Admin Panel

1. Navigate to `/admin/index.html`
2. Login with admin credentials
3. Access various management modules

### Admin Modules

- **Dashboard**: Overview of sales, orders, products
- **Products**: Manage product catalog
- **Orders**: View and update orders
- **Live Editor**: Visual page builder
- **CMS Manager**: Homepage content management
- **Coupons**: Discount code management
- **Settings**: Webhooks and integrations

---

## Custom Integrations

### Setting Up Webhooks

1. **Create Webhook Endpoint** on your server:

```javascript
app.post('/my-webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  // Verify signature if secret key is set
  const expected = crypto
    .createHmac('sha256', 'your-secret-key')
    .update(JSON.stringify(payload))
    .digest('hex');
  
  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Handle event
  switch (payload.event) {
    case 'order.created':
      console.log('New order:', payload.data);
      break;
    case 'cart.abandoned':
      console.log('Abandoned cart:', payload.data);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

2. **Register Webhook** via Admin Panel or API:

```bash
curl -X POST https://yourstore.com/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Integration",
    "url": "https://myapp.com/webhook",
    "events": ["order.created", "order.paid"],
    "secret_key": "your-secret-key"
  }'
```

### Supported Integration Types

- **Email Marketing**: Mailchimp, SendGrid, Klaviyo
- **Analytics**: Google Analytics, Mixpanel, Segment
- **ERP Systems**: Custom ERP synchronization
- **Shipping**: Shiprocket, Delhivery, FedEx
- **Accounting**: Tally, QuickBooks, Zoho Books
- **CRM**: HubSpot, Salesforce, Zoho CRM

---

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` in `.env.local`
2. Check database is running and accessible
3. Ensure SSL mode is correct for cloud databases
4. Test connection: `node utils/db.js`

### API Not Working

1. Check serverless function deployment (if using Vercel)
2. Verify environment variables are set
3. Check browser console for errors
4. Review Vercel/function logs

### Images Not Loading

1. Ensure images exist in `/images/` directory
2. Check file paths are correct (`.png` not `.webp`)
3. Verify server is serving static files

### Payment Issues

1. Verify Razorpay credentials in `.env.local`
2. Check webhook URL is publicly accessible
3. Test in Razorpay test mode first
4. Review payment logs in admin panel

---

## File Structure

```
/workspace
├── api/
│   ├── index.js              # Main API router
│   └── enhanced-features.js  # Feature modules
├── admin/
│   ├── index.html            # Admin dashboard
│   ├── live-editor.html      # Visual page editor
│   ├── cms-manager.html      # CMS content manager
│   └── ...
├── pages/
│   ├── account.html          # Customer account
│   ├── cart.html             # Shopping cart
│   ├── checkout.html         # Checkout page
│   ├── product.html          # Product detail
│   └── products.html         # Product listing
├── css/
│   └── style.css             # Main stylesheet
├── js/
│   ├── cartManager.js        # Cart functionality
│   └── productRenderer.js    # Product display
├── images/                   # Product & banner images
├── utils/
│   ├── db.js                 # Database connection
│   ├── schema.sql            # Database schema
│   └── lib/auth.js           # Authentication helpers
├── index.html                # Homepage
├── package.json              # Dependencies
├── vercel.json               # Vercel config
└── .env.local                # Environment variables (gitignore)
```

---

## Security Best Practices

1. **Never commit `.env.local`** - Contains sensitive credentials
2. **Change default admin password** immediately
3. **Use HTTPS** in production
4. **Set strong JWT secret** - Minimum 32 characters
5. **Enable rate limiting** on API endpoints
6. **Validate all inputs** server-side
7. **Use prepared statements** (already implemented)
8. **Regular backups** of database

---

## Support

For issues or questions:
- Check existing documentation
- Review error logs
- Test database connection
- Verify environment variables

---

**Version:** 2.0  
**Last Updated:** June 2026  
**License:** Proprietary
