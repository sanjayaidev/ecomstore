# E-Commerce Store - Developer README

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Environment Variables](#environment-variables)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Webhooks](#webhooks)
6. [Payment Integration](#payment-integration)
7. [Customization Guide](#customization-guide)
8. [Deployment](#deployment)

---

## Tech Stack

### Frontend
- **HTML5/CSS3** - Semantic markup and modern styling
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome 6.4** - Icons
- **Responsive Design** - Mobile-first approach

### Backend
- **Node.js** (ES Modules)
- **Vercel Serverless Functions** - API routes
- **Neon PostgreSQL** - Database
- **pg/neon** - Database client
- **jsonwebtoken** - Authentication

### Payment Gateways
- **Razorpay** - Primary payment processor
- **Cashfree** - Secondary payment processor

---

## Environment Variables

Copy `.env.local` and configure:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
NEON_HOST="ep-xxx.region.aws.neon.tech"
NEON_DATABASE="dbname"
NEON_USER="username"
NEON_PASSWORD="password"

# Razorpay Payment Gateway
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="secret_key_here"
RAZORPAY_WEBHOOK_SECRET="webhook_secret_here"

# Cashfree Payment Gateway
CASHFREE_APP_ID="your_app_id"
CASHFREE_SECRET_KEY="your_secret_key"

# Base URL for Webhooks (change for production)
BASE_URL="http://localhost:3000"

# JWT Secret for Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Admin Credentials
ADMIN_EMAIL="admin@mystore.com"
ADMIN_PASSWORD="secure_password_here"

# Application Settings
PORT=3000
NODE_ENV="development"  # Change to "production" for live site
```

### Security Notes
- Never commit `.env.local` to version control
- Use strong, unique passwords
- Rotate secrets regularly
- Use environment-specific values for production

---

## Database Schema

### Core Tables

#### `products`
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- discount_price (DECIMAL, nullable)
- category (VARCHAR)
- image_1, image_2 (TEXT)
- sizes (JSONB array)
- stock (INT)
- created_at, updated_at (TIMESTAMP)
```

#### `orders`
```sql
- id (SERIAL PRIMARY KEY)
- order_number (VARCHAR UNIQUE)
- customer_name, customer_email, customer_phone (VARCHAR)
- shipping_address (JSONB)
- items (JSONB)
- subtotal, shipping_cost, total_amount (DECIMAL)
- status (VARCHAR: pending/processing/shipped/delivered/cancelled)
- payment_method (VARCHAR: razorpay/cashfree/cod)
- payment_reference (VARCHAR)
- created_at (TIMESTAMP)
```

#### `customers`
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- phone (VARCHAR)
- addresses (JSONB array)
- created_at (TIMESTAMP)
```

### CMS Tables

#### `cms_hero_sliders`
```sql
- id (SERIAL PRIMARY KEY)
- title, subtitle (VARCHAR/TEXT)
- image_url (TEXT)
- cta_text, cta_link (VARCHAR)
- bg_color (VARCHAR hex)
- display_order (INT)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### `cms_categories`, `cms_offer_banners`, `cms_product_sections`, `cms_trust_features`
Similar structure with `display_order` and `is_visible/is_active` flags.

### Enhanced Features Tables

#### `layout_sections`
Dynamic page builder storage:
```sql
- id (SERIAL PRIMARY KEY)
- section_id (VARCHAR UNIQUE)
- page_name (VARCHAR: homepage/product/collection/cart/checkout)
- type (VARCHAR: hero/featured_collection/promo_banner/etc)
- order_index (INT)
- settings (JSONB)
- is_visible (BOOLEAN)
```

#### `webhooks`
Custom integration webhooks:
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- url (TEXT)
- events (TEXT[])
- secret_key (VARCHAR)
- is_active (BOOLEAN)
- last_triggered_at (TIMESTAMP)
- success_count, failure_count (INT)
```

#### `coupons`
Discount management:
```sql
- id (SERIAL PRIMARY KEY)
- code (VARCHAR UNIQUE)
- type (percentage/fixed/buy_x_get_y/bundle)
- value (DECIMAL)
- min_purchase_amount (DECIMAL)
- usage_limit, usage_count (INT)
- valid_from, valid_until (TIMESTAMP)
- applicable_collections, applicable_products (INT[])
```

#### `abandoned_carts`
Cart recovery:
```sql
- id (SERIAL PRIMARY KEY)
- cart_id (VARCHAR UNIQUE)
- user_email (VARCHAR)
- items (JSONB)
- total_amount (DECIMAL)
- recovered (BOOLEAN)
- recovery_email_sent (BOOLEAN)
```

### Schema Migration
Run `/utils/schema.sql` to create/update tables:
```bash
psql $DATABASE_URL -f utils/schema.sql
```

---

## API Endpoints

Base URL: `/api`

### Products
```
GET    /api/products              - List all products (with filters)
GET    /api/products?id=1         - Get single product
POST   /api/products              - Create product (admin)
PUT    /api/products?id=1         - Update product (admin)
DELETE /api/products?id=1         - Delete product (admin)
```

### Orders
```
GET    /api/orders                - List orders (admin)
GET    /api/orders?id=123         - Get order details
POST   /api/orders                - Create order (checkout)
PUT    /api/orders?id=123         - Update order status (admin)
```

### Customers/Auth
```
POST   /api/auth/register         - Register new customer
POST   /api/auth/login            - Customer login
GET    /api/auth/me               - Get current customer (requires token)
PUT    /api/auth/profile          - Update profile
```

### CMS Content
```
GET    /api/cms                   - Get all CMS data
GET    /api/cms/sliders           - Get hero sliders
POST   /api/cms/sliders           - Add slider (admin)
PUT    /api/cms/sliders?id=1      - Update slider (admin)
DELETE /api/cms/sliders?id=1      - Delete slider (admin)

GET    /api/cms/categories        - Get categories
GET    /api/cms/banners           - Get offer banners
GET    /api/cms/sections          - Get product sections
GET    /api/cms/trust             - Get trust features
GET    /api/cms/newsletter        - Get newsletter settings
```

### Layout Sections (Visual Editor)
```
GET    /api/layout-sections?page=homepage     - Get layout for page
POST   /api/layout-sections                   - Create section
PUT    /api/layout-sections?id=xxx            - Update section
DELETE /api/layout-sections?id=xxx            - Delete section
POST   /api/layout-sections/reorder           - Reorder sections
POST   /api/layout-sections/bulk-save         - Bulk save all sections
```

### Webhooks (Custom Integrations)
```
GET    /api/webhooks                          - List webhooks (admin)
POST   /api/webhooks                          - Create webhook (admin)
PUT    /api/webhooks?id=1                     - Update webhook (admin)
DELETE /api/webhooks?id=1                     - Delete webhook (admin)
POST   /api/webhooks/test?id=1                - Test webhook (admin)
```

### Coupons
```
GET    /api/coupons                           - List coupons (admin)
POST   /api/coupons                           - Create coupon (admin)
POST   /api/coupons/validate                  - Validate coupon code
```

### Abandoned Carts
```
GET    /api/abandoned-carts                   - List abandoned carts (admin)
POST   /api/abandoned-carts                   - Log abandoned cart
POST   /api/abandoned-carts/recover           - Send recovery email
```

### Collections
```
GET    /api/collections                       - List collections
GET    /api/collections?slug=summer-sale      - Get collection by slug
POST   /api/collections                       - Create collection (admin)
PUT    /api/collections?id=1                  - Update collection (admin)
POST   /api/collections/products              - Add products to collection
```

---

## Webhooks

### Incoming Webhooks (Payment Gateways)

#### Razorpay Webhook
Endpoint: `/api/payment/razorpay/webhook`

Events handled:
- `payment.captured`
- `payment.failed`
- `order.paid`

Verification: Uses `RAZORPAY_WEBHOOK_SECRET`

#### Cashfree Webhook
Endpoint: `/api/payment/cashfree/webhook`

Events handled:
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILURE`
- `REFUND_INITIATED`

Verification: Uses `CASHFREE_SECRET_KEY`

### Outgoing Webhooks (Custom Integrations)

Configure in Admin → Integrations & Webhooks

Available Events:
- `order.created` - New order placed
- `order.updated` - Order status changed
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `product.low_stock` - Product stock below threshold
- `customer.registered` - New customer signup

Webhook Payload Example:
```json
{
  "event": "order.created",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "order_id": 123,
    "order_number": "ORD-2026-001",
    "customer": { "email": "customer@example.com" },
    "total": 1999.00,
    "items": [...]
  }
}
```

---

## Payment Integration

### Razorpay Setup

1. **Get API Keys**:
   - Login to Razorpay Dashboard
   - Settings → API Keys
   - Generate Test/Live keys

2. **Configure Webhook**:
   - Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payment/razorpay/webhook`
   - Select events: Payment Captured, Payment Failed
   - Save secret

3. **Frontend Integration**:
```javascript
const options = {
  key: process.env.RAZORPAY_KEY_ID,
  amount: totalAmount * 100, // Amount in paise
  currency: "INR",
  name: "Your Store",
  description: "Order Payment",
  handler: function(response) {
    // Send payment_id to backend for verification
    fetch('/api/payment/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature
      })
    });
  }
};
const rzp = new Razorpay(options);
rzp.open();
```

### Cashfree Setup

1. **Get API Keys**:
   - Login to Cashfree Dashboard
   - Account Settings → API Credentials
   - Note App ID and Secret Key

2. **Configure Webhook**:
   - Dashboard → Notifications
   - Add endpoint: `https://yourdomain.com/api/payment/cashfree/webhook`
   - Select events

3. **Frontend Integration**:
```javascript
// Initialize Cashfree checkout
Cashfree.checkout({
  appId: process.env.CASHFREE_APP_ID,
  orderId: orderNumber,
  orderAmount: totalAmount,
  orderCurrency: "INR",
  customerDetails: { ... },
  redirectComponent: { mode: "popup" }
});
```

---

## Customization Guide

### Styling

Edit `/css/style.css` for global styles:
```css
:root {
  --primary: #008060;      /* Main brand color */
  --secondary: #5a667f;    /* Secondary color */
  --accent: #ff6b6b;       /* Accent/highlight */
  --text-primary: #111827; /* Main text */
  --bg-main: #f9fafb;      /* Background */
}
```

### Adding New Sections

1. **Database**: Add to `layout_sections` table
2. **API**: Handler in `/api/index.js`
3. **Frontend**: Render logic in `/index.html` or page files
4. **Admin**: Add editor controls in `/admin/layout-editor.html`

### Custom Payment Methods

Add new gateway:
1. Add env vars for gateway credentials
2. Create webhook handler in `/api/index.js`
3. Add frontend checkout script
4. Update checkout page to show new option

### Email Templates

Currently using simple text emails. For HTML templates:
1. Create templates in `/templates/email/`
2. Use a library like `nodemailer` for sending
3. Configure SMTP in env vars

---

## Deployment

### Vercel Deployment

1. **Push to Git**: Ensure code is in GitHub/GitLab
2. **Import to Vercel**: Connect repository
3. **Environment Variables**: Add all from `.env.local`
4. **Deploy**: Automatic on push to main branch

### Environment-Specific Configs

**Development**:
```bash
NODE_ENV=development
BASE_URL=http://localhost:3000
```

**Production**:
```bash
NODE_ENV=production
BASE_URL=https://yourdomain.com
# Use production database credentials
# Use live payment gateway keys
```

### Database Migrations

Before first deployment:
```bash
psql $DATABASE_URL -f utils/schema.sql
```

For updates, add migration scripts to `/migrations/`

### Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Database**: Neon dashboard for query performance
- **Logs**: Vercel function logs for debugging
- **Uptime**: Use external service like UptimeRobot

---

## Development Workflow

### Local Setup

```bash
# Clone repository
git clone <repo-url>
cd ecommerce-store

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your credentials

# Run local server
npx vercel dev

# Open browser
http://localhost:3000
```

### Testing

- Manual testing of all user flows
- API testing with Postman/Insomnia
- Payment gateway test modes
- Mobile responsiveness checks

### Version Control

```bash
# Feature branch
git checkout -b feature/new-payment-gateway

# Commit changes
git add .
git commit -m "Add Cashfree payment integration"

# Push and PR
git push origin feature/new-payment-gateway
```

---

## Troubleshooting

### Common Issues

**Database Connection Failed**:
- Check `DATABASE_URL` format
- Verify SSL mode is set
- Ensure IP is whitelisted in Neon dashboard

**Payment Webhook Not Working**:
- Verify webhook URL is publicly accessible
- Check secret key matches
- Review webhook logs in gateway dashboard

**Images Not Loading**:
- Use absolute URLs for images
- Check CORS settings if using CDN
- Verify image paths are correct

**Authentication Issues**:
- Ensure `JWT_SECRET` is set
- Check token expiration
- Verify password hashing

---

## Support & Resources

- **Neon DB Docs**: https://neon.tech/docs
- **Razorpay Docs**: https://razorpay.com/docs
- **Cashfree Docs**: https://docs.cashfree.com
- **Vercel Docs**: https://vercel.com/docs

---

**Last Updated**: 2026
**Version**: 2.0
