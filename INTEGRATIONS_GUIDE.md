# WhatsApp & Email Integration Guide

## Overview

This project now includes complete WhatsApp and Email integration capabilities using Google Apps Script as a middleware layer. The system supports:

- **Abandoned Cart Recovery** (WhatsApp + Email)
- **Order Status Notifications** (WhatsApp + Email)
- **Promotional Offers** (WhatsApp + Email)
- **OTP Verification** (WhatsApp)
- **Newsletter Subscriptions** (Email)
- **Customer Notifications** (WhatsApp + Email)

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  EcomStore  │────▶│  API Routes  │────▶│ Google Apps     │────▶│ Google Sheet │
│   Admin/    │     │ /api/        │     │ Script Web App  │     │ (Data Store) │
│   Frontend  │     │ integrations │     │                 │     │              │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                           │                      │
                           │                      ▼
                           │            ┌─────────────────┐
                           │            │ WhatsApp        │
                           │            │ Business API    │
                           │            │ or Email SMTP   │
                           │            └─────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Environment     │
                  │ Variables       │
                  └─────────────────┘
```

---

## Setup Instructions

### Step 1: Create Google Apps Script

#### For WhatsApp Integration:

1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Paste the following code:

```javascript
// WhatsApp Integration Apps Script
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('WhatsAppMessages') || 
                SpreadsheetApp.getActiveSpreadsheet().insertSheet('WhatsAppMessages');
  
  // Add headers if new sheet
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Type', 'Customer Name', 'Phone', 'Email', 'Data', 'Status']);
  }
  
  // Log the message
  sheet.appendRow([
    new Date(),
    data.type || 'unknown',
    data.customer?.name || '',
    data.customer?.phone || '',
    data.customer?.email || '',
    JSON.stringify(data.data || {}),
    'pending'
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, id: new Date().getTime() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Deploy as Web App:
   - Click **Deploy** → **New Deployment**
   - Select type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**
   - Copy the Web App URL

#### For Email Integration:

1. Create another Apps Script project
2. Paste the following code:

```javascript
// Email Integration Apps Script
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('EmailQueue') || 
                SpreadsheetApp.getActiveSpreadsheet().insertSheet('EmailQueue');
  
  // Add headers if new sheet
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Type', 'Recipient', 'Template Data', 'Status', 'Sent At']);
  }
  
  // Log the email request
  sheet.appendRow([
    new Date(),
    data.type || 'unknown',
    data.recipient || '',
    JSON.stringify(data.templateData || {}),
    'queued',
    ''
  ]);
  
  // Optional: Send email directly from Apps Script
  try {
    const templateData = data.templateData || {};
    const subject = templateData.subject || `EcomStore: ${data.type}`;
    const body = templateData.message || JSON.stringify(templateData);
    
    MailApp.sendEmail({
      to: data.recipient,
      subject: subject,
      htmlBody: `<div style="font-family:Arial,sans-serif">${body}</div>`
    });
    
    // Update status
    sheet.getRange(sheet.getLastRow(), 5).setValue('sent');
    sheet.getRange(sheet.getLastRow(), 6).setValue(new Date());
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, sent: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    sheet.getRange(sheet.getLastRow(), 5).setValue('failed');
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Deploy as Web App (same steps as above)
4. Copy the Web App URL

---

### Step 2: Configure Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
# WhatsApp Integration
WHATSAPP_SHEET_URL=https://script.google.com/macros/s/YOUR_WHATSAPP_SCRIPT_ID/exec

# Email Integration
EMAIL_SHEET_URL=https://script.google.com/macros/s/YOUR_EMAIL_SCRIPT_ID/exec

# Newsletter (optional - uses EMAIL_SHEET_URL if not set)
NEWSLETTER_SHEET_URL=https://script.google.com/macros/s/YOUR_NEWSLETTER_SCRIPT_ID/exec

# Store URL (for recovery links)
STORE_URL=https://your-store.vercel.app
```

---

### Step 3: Configure in Admin Panel

1. Login to Admin Dashboard (`/admin`)
2. Go to **Settings** → **Integrations** tab
3. Enter your Google Apps Script URLs:
   - WhatsApp Integration URL
   - Email Integration URL
4. Click **Save** for each
5. Use **Test WhatsApp** and **Test Email** buttons to verify

---

## API Endpoints

### Base URL: `/api/integrations`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp` | POST | Send WhatsApp message via sheet |
| `/email` | POST | Send email via sheet |
| `/newsletter` | POST | Subscribe to newsletter |
| `/abandoned-cart` | POST | Send abandoned cart recovery |
| `/order-notification` | POST | Send order status update |
| `/otp` | POST | Send OTP verification |
| `/promotional` | POST | Send promotional campaign |

---

## Usage Examples

### 1. Abandoned Cart Recovery

```javascript
// From admin panel or automated trigger
const response = await fetch('/api/integrations/abandoned-cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cartId: 'cart_12345',
    customerData: {
      name: 'John Doe',
      phone: '+919876543210',
      email: 'john@example.com'
    },
    cartItems: [
      { product_id: 1, title: 'Silk Saree', price: 1999, quantity: 1 }
    ],
    total: 2099,
    recoveryType: 'whatsapp_and_email'
  })
});
```

### 2. Order Status Notification

```javascript
const response = await fetch('/api/integrations/order-notification', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'ORD-2024-001',
    customerData: {
      name: 'Jane Smith',
      phone: '+919876543210',
      email: 'jane@example.com'
    },
    orderDetails: {
      items: 3,
      total: 4999,
      trackingNumber: 'TRK123456'
    },
    notificationType: 'order_shipped' // or: order_confirmation, order_delivered, order_cancelled
  })
});
```

### 3. OTP Verification

```javascript
const response = await fetch('/api/integrations/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919876543210',
    purpose: 'login' // or: checkout, phone_verification
  })
});
```

### 4. Newsletter Subscription

```javascript
// Automatically called when user subscribes on homepage
const response = await fetch('/api/integrations/newsletter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'customer@example.com',
    name: 'Customer Name',
    phone: '+919876543210', // optional
    preferences: {
      categories: ['sarees', 'kurtis'],
      frequency: 'weekly'
    }
  })
});
```

### 5. Promotional Campaign

```javascript
const response = await fetch('/api/integrations/promotional', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignName: 'Diwali Sale 2024',
    offerDetails: {
      title: '50% OFF on All Sarees',
      code: 'DIWALI50',
      validUntil: '2024-11-15',
      terms: 'Valid on orders above ₹999'
    },
    recipientList: [
      { name: 'Customer 1', phone: '+919876543210', email: 'c1@example.com' },
      { name: 'Customer 2', phone: '+919876543211', email: 'c2@example.com' }
    ]
  })
});
```

---

## Data Structure in Google Sheets

### WhatsAppMessages Sheet

| Timestamp | Type | Customer Name | Phone | Email | Data | Status |
|-----------|------|---------------|-------|-------|------|--------|
| 2024-01-15 10:30:00 | abandoned_cart | John Doe | +919876543210 | john@example.com | {"cartId":"123","total":2099} | pending |

### EmailQueue Sheet

| Timestamp | Type | Recipient | Template Data | Status | Sent At |
|-----------|------|-----------|---------------|--------|---------|
| 2024-01-15 10:30:00 | cart_recovery | john@example.com | {"name":"John","cartId":"123"} | sent | 2024-01-15 10:30:05 |

---

## Automation Triggers

You can set up automated triggers in your Apps Script to process queued messages:

```javascript
// Process WhatsApp messages every 5 minutes
function processWhatsAppQueue() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('WhatsAppMessages');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === 'pending') { // Status column
      const row = i + 1;
      const phone = data[i][3];
      const messageData = JSON.parse(data[i][5]);
      
      // Call WhatsApp Business API here
      // Update status to 'sent' or 'failed'
      sheet.getRange(row, 7).setValue('sent');
    }
  }
}

// Set time-driven trigger
ScriptApp.newTrigger('processWhatsAppQueue')
  .timeBased()
  .everyMinutes(5)
  .create();
```

---

## Security Considerations

1. **Validate Incoming Requests**: Add signature validation in production
2. **Rate Limiting**: Implement rate limiting in Apps Script
3. **Data Encryption**: Encrypt sensitive data before storing in sheets
4. **Access Control**: Restrict sheet access to authorized personnel only
5. **Environment Variables**: Never commit sheet URLs to version control

---

## Troubleshooting

### Issue: "Sheet URL not configured"
**Solution**: Ensure environment variables are set correctly in `.env` or Vercel dashboard

### Issue: "Connection failed"
**Solution**: 
- Verify Apps Script is deployed as "Anyone" can access
- Check that the URL ends with `/exec`
- Test the URL directly in browser

### Issue: Messages not sending
**Solution**:
- Check Google Sheet permissions
- Verify Apps Script execution logs (View → Executions)
- Ensure quota limits haven't been exceeded

---

## Next Steps

1. **WhatsApp Business API**: Integrate with official WhatsApp Business API for actual message delivery
2. **Email Templates**: Create rich HTML email templates in Apps Script
3. **Analytics**: Track open rates, click-through rates, and conversions
4. **A/B Testing**: Test different message formats and timing
5. **Customer Segmentation**: Segment customers based on behavior for targeted campaigns

---

## Support

For issues or questions:
- Check Apps Script execution logs
- Review API response errors in browser console
- Verify environment variable configuration
- Test endpoints using tools like Postman
