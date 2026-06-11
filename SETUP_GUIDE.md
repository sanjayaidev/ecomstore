# E-Commerce Store - Setup and Usage Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Customer Features](#customer-features)
3. [Admin Dashboard](#admin-dashboard)
4. [Managing Products](#managing-products)
5. [Managing Orders](#managing-orders)
6. [Homepage CMS](#homepage-cms)
7. [Payment Methods](#payment-methods)

---

## Getting Started

### For Customers
1. **Browse Products**: Visit the homepage to see featured products, categories, and current offers
2. **Search**: Use the search bar to find specific products
3. **Add to Cart**: Click "Add to Cart" on any product page
4. **Checkout**: Go to cart → Proceed to Checkout → Fill in shipping details → Choose payment method
5. **Track Orders**: Login to your account to view order history and status

### For Store Owners
1. **Access Admin**: Navigate to `/admin` 
2. **Login**: Use admin credentials (configured in environment variables)
3. **Dashboard**: View sales overview, recent orders, and key metrics

---

## Customer Features

### Account Management
- **Register**: Create an account during checkout or via the Register page
- **Login/Logout**: Access your account to view orders, update profile
- **Profile**: Update email, phone, shipping addresses

### Shopping Experience
- **Categories**: Browse by Sarees, Kurtis, Dresses, Jewellery, Footwear, Accessories
- **Filters**: Filter products by price, category, availability
- **Sort**: Sort by price (low-high), newest arrivals, trending
- **Product Details**: View multiple images, sizes, descriptions, prices

### Cart & Checkout
- **Cart Management**: Add/remove items, update quantities
- **Coupon Codes**: Apply discount codes at checkout
- **Multiple Payments**: 
  - Razorpay (Credit/Debit cards, UPI, Net Banking, Wallets)
  - Cashfree (Cards, UPI, Net Banking)
  - COD (Cash on Delivery)
- **Order Confirmation**: Receive order ID and email confirmation

---

## Admin Dashboard

### Navigation
The admin sidebar contains:
- **Overview**: Dashboard with stats
- **Catalogue**: Products, Collections, Categories
- **Sales**: Orders, Abandoned Carts, Coupons, Customers
- **Content**: Homepage CMS
- **Insights**: Analytics
- **System**: Integrations & Webhooks, Settings

### Top Bar Tools
- **🎨 Layout Designer**: Opens in new tab - drag-and-drop page builder
- **🚀 Live Editor**: Opens in new tab - visual editor with live preview

---

## Managing Products

### Add/Edit Products
1. Go to **Products** section
2. Click **+ Add Product**
3. Fill in:
   - Title, Description
   - Price, Discount Price (optional)
   - Category
   - Images (upload URLs)
   - Sizes (S, M, L, XL, etc.)
   - Stock quantity
4. Save

### Bulk Actions
- Select multiple products
- Export to CSV
- Bulk delete
- Filter by category, stock status

---

## Managing Orders

### Order Status Flow
1. **Pending**: New order, awaiting confirmation
2. **Processing**: Order confirmed, being prepared
3. **Shipped**: Dispatched with tracking info
4. **Delivered**: Successfully delivered
5. **Cancelled**: Order cancelled (by customer/admin)

### Order Management
- View all orders or filter by status
- Search by order ID or customer name
- Update order status
- View order details (items, customer info, payment)
- Export orders to CSV

### Abandoned Carts
- View carts where customers didn't complete purchase
- Send recovery emails
- Analyze abandonment reasons

---

## Homepage CMS

### Hero Sliders
Manage the main slideshow on homepage:
1. Go to **Homepage CMS** → **Hero Sliders**
2. Add/Edit sliders with:
   - Title, Subtitle
   - Background image
   - CTA text and link
   - Background color
   - Display order
3. Toggle active/inactive

### Categories Section
Customize category cards displayed on homepage

### Offer Banners
Create promotional banners:
- Set title, offer text
- Upload banner image
- Configure colors
- Set start/end dates for time-limited offers

### Product Sections
Configure sections like:
- Featured Products
- Trending Now
- New Arrivals
- Custom collections

### Trust Features
Edit the 4 trust badges:
- Free Shipping
- Easy Returns
- Secure Payment
- 24/7 Support

### Newsletter
Customize newsletter subscription section

---

## Payment Methods

### Razorpay Configuration
Environment variables required:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

**Supported Methods:**
- Credit/Debit Cards (Visa, Mastercard, Amex, Rupay)
- UPI (GPay, PhonePe, Paytm, BHIM)
- Net Banking
- Wallets (Paytm, JioMoney, etc.)
- EMI options

### Cashfree Configuration
Environment variables required:
```
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
```

**Supported Methods:**
- Cards (all major networks)
- UPI
- Net Banking
- Wallets

### Webhook Setup
For payment confirmations:
1. Go to **Integrations & Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payment/webhook`
3. Select events: `order.created`, `payment.captured`, `payment.failed`
4. Save secret key for verification

---

## Visual Editors

### Layout Designer (`/admin/layout-editor.html`)
- Drag-and-drop sections to build page layouts
- Available for: Homepage, Product Page, Collection Page, Cart, Checkout
- Add sections: Hero, Featured Products, Promo Banner, Newsletter, Testimonials, Gallery, Video, Rich Text
- Edit section settings (colors, text, limits)
- Preview and apply to live site

### Live Site Editor (`/admin/live-editor.html`)
- Real-time visual editing of live pages
- Click any section to edit
- Move/reorder sections
- Version history (rollback to previous versions)
- Publish changes instantly

---

## Tips & Best Practices

### Product Management
- Use high-quality images (minimum 800x800px)
- Write detailed descriptions with keywords
- Keep stock updated to avoid overselling
- Use categories and collections for better organization

### Order Fulfillment
- Process orders within 24 hours
- Update status promptly
- Communicate delays to customers
- Use tracking numbers for shipped orders

### Marketing
- Create time-limited offers with countdown banners
- Use coupon codes for promotions
- Recover abandoned carts with email campaigns
- Feature bestsellers on homepage

### Performance
- Optimize images before upload
- Limit homepage products to 8-12 per section
- Use collections to group related products
- Regular cleanup of old/cancelled orders

---

## Support

For technical issues or customization help:
- Check API documentation in `DEVELOPER_README.md`
- Review webhook logs in Integrations section
- Contact development team for custom features

---

**Last Updated**: 2026
**Version**: 2.0
