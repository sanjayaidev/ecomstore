// ═══════════════════════════════════════════
// api/integrations.js — WhatsApp & Email Integrations
// Placeholder routes for Google Apps Script integration
// ═══════════════════════════════════════════

'use strict';

/**
 * Send data to Google Sheet via Apps Script Web App
 * @param {string} sheetUrl - The deployed Apps Script web app URL
 * @param {object} data - Data to send to the sheet
 * @returns {Promise<object>} Response from the sheet
 */
async function sendToGoogleSheet(sheetUrl, data) {
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Sheet API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[sendToGoogleSheet] Error:', error.message);
    throw error;
  }
}

/**
 * WhatsApp Integration Handler
 * Sends customer data to Google Sheet for WhatsApp Business API integration
 * 
 * Use cases: abandoned cart, order status, offers, notifications, OTP
 */
export async function handleWhatsAppIntegration(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { type, customerData, sheetUrl } = body;
    
    // Validate required fields
    if (!type) {
      return res.status(400).json({ error: 'Message type required' });
    }
    
    if (!customerData) {
      return res.status(400).json({ error: 'Customer data required' });
    }
    
    // Get sheet URL from env or request
    const appsScriptUrl = sheetUrl || process.env.WHATSAPP_SHEET_URL;
    
    if (!appsScriptUrl) {
      return res.status(500).json({ 
        error: 'WhatsApp Sheet URL not configured',
        hint: 'Set WHATSAPP_SHEET_URL environment variable or pass sheetUrl in request'
      });
    }
    
    // Prepare payload for Google Sheet
    const payload = {
      action: 'whatsapp_integration',
      timestamp: new Date().toISOString(),
      type: type, // abandoned_cart, order_status, offer, notification, otp
      customer: {
        name: customerData.name || '',
        phone: customerData.phone || '',
        email: customerData.email || ''
      },
      data: customerData.data || {},
      metadata: {
        source: 'ecomstore',
        version: '1.0'
      }
    };
    
    // Send to Google Sheet
    const result = await sendToGoogleSheet(appsScriptUrl, payload);
    
    return res.status(200).json({
      success: true,
      message: `WhatsApp ${type} data sent to sheet`,
      sheetResponse: result
    });
    
  } catch (error) {
    console.error('[handleWhatsAppIntegration] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Email Integration Handler
 * Sends emails via Google Apps Script for various notifications
 * 
 * Use cases: order confirmation, shipping update, newsletter, promotional emails
 */
export async function handleEmailIntegration(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { type, recipient, templateData, sheetUrl } = body;
    
    // Validate required fields
    if (!type) {
      return res.status(400).json({ error: 'Email type required' });
    }
    
    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email required' });
    }
    
    // Get sheet URL from env or request
    const appsScriptUrl = sheetUrl || process.env.EMAIL_SHEET_URL;
    
    if (!appsScriptUrl) {
      return res.status(500).json({ 
        error: 'Email Sheet URL not configured',
        hint: 'Set EMAIL_SHEET_URL environment variable or pass sheetUrl in request'
      });
    }
    
    // Prepare payload for Google Sheet
    const payload = {
      action: 'email_integration',
      timestamp: new Date().toISOString(),
      type: type, // order_confirmation, shipping_update, newsletter, promotional, otp, recovery
      recipient: recipient,
      templateData: templateData || {},
      metadata: {
        source: 'ecomstore',
        version: '1.0'
      }
    };
    
    // Send to Google Sheet
    const result = await sendToGoogleSheet(appsScriptUrl, payload);
    
    return res.status(200).json({
      success: true,
      message: `Email ${type} queued for ${recipient}`,
      sheetResponse: result
    });
    
  } catch (error) {
    console.error('[handleEmailIntegration] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Newsletter Subscription Handler
 * Saves newsletter subscriptions to Google Sheet and triggers welcome email
 */
export async function handleNewsletterSubscribe(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { email, name, phone, preferences } = body;
    
    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    // Get sheet URL from env or request
    const appsScriptUrl = process.env.NEWSLETTER_SHEET_URL || process.env.EMAIL_SHEET_URL;
    
    if (!appsScriptUrl) {
      return res.status(500).json({ 
        error: 'Newsletter Sheet URL not configured',
        hint: 'Set NEWSLETTER_SHEET_URL environment variable'
      });
    }
    
    // Prepare subscription data
    const payload = {
      action: 'newsletter_subscription',
      timestamp: new Date().toISOString(),
      subscriber: {
        email: email,
        name: name || '',
        phone: phone || '',
        preferences: preferences || {}
      },
      metadata: {
        source: 'ecomstore',
        ip: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
        userAgent: req.headers?.['user-agent'] || 'unknown'
      }
    };
    
    // Send to Google Sheet
    const result = await sendToGoogleSheet(appsScriptUrl, payload);
    
    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      sheetResponse: result
    });
    
  } catch (error) {
    console.error('[handleNewsletterSubscribe] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Abandoned Cart Recovery Handler
 * Sends abandoned cart data to WhatsApp and Email systems
 */
export async function handleAbandonedCartRecovery(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { cartId, customerData, cartItems, total, recoveryType } = body;
    
    // Validate required fields
    if (!cartId || !customerData) {
      return res.status(400).json({ error: 'Cart ID and customer data required' });
    }
    
    const results = { whatsapp: null, email: null };
    
    // Send to WhatsApp if phone available
    if (customerData.phone && process.env.WHATSAPP_SHEET_URL) {
      try {
        const whatsappPayload = {
          type: 'abandoned_cart',
          customerData: {
            name: customerData.name || '',
            phone: customerData.phone,
            email: customerData.email || ''
          },
          data: {
            cartId,
            items: cartItems || [],
            total,
            recoveryUrl: `${process.env.STORE_URL || ''}/pages/cart.html?recovery=${cartId}`
          }
        };
        
        results.whatsapp = await sendToGoogleSheet(process.env.WHATSAPP_SHEET_URL, whatsappPayload);
      } catch (err) {
        console.error('[AbandonedCart WhatsApp] Error:', err.message);
        results.whatsapp = { error: err.message };
      }
    }
    
    // Send to Email if email available
    if (customerData.email && process.env.EMAIL_SHEET_URL) {
      try {
        const emailPayload = {
          type: 'cart_recovery',
          recipient: customerData.email,
          templateData: {
            customerName: customerData.name || 'Valued Customer',
            cartId,
            items: cartItems || [],
            total,
            recoveryUrl: `${process.env.STORE_URL || ''}/pages/cart.html?recovery=${cartId}`
          }
        };
        
        results.email = await sendToGoogleSheet(process.env.EMAIL_SHEET_URL, emailPayload);
      } catch (err) {
        console.error('[AbandonedCart Email] Error:', err.message);
        results.email = { error: err.message };
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Abandoned cart recovery initiated',
      results
    });
    
  } catch (error) {
    console.error('[handleAbandonedCartRecovery] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Order Notification Handler
 * Sends order updates via WhatsApp and Email
 */
export async function handleOrderNotification(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { orderId, customerData, orderDetails, notificationType } = body;
    
    // Validate required fields
    if (!orderId || !customerData) {
      return res.status(400).json({ error: 'Order ID and customer data required' });
    }
    
    const validTypes = ['order_confirmation', 'order_shipped', 'order_out_for_delivery', 'order_delivered', 'order_cancelled'];
    if (notificationType && !validTypes.includes(notificationType)) {
      return res.status(400).json({ error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` });
    }
    
    const results = { whatsapp: null, email: null };
    const type = notificationType || 'order_confirmation';
    
    // Send to WhatsApp if phone available
    if (customerData.phone && process.env.WHATSAPP_SHEET_URL) {
      try {
        const whatsappPayload = {
          type: 'order_status',
          customerData: {
            name: customerData.name || '',
            phone: customerData.phone,
            email: customerData.email || ''
          },
          data: {
            orderId,
            status: type,
            details: orderDetails || {}
          }
        };
        
        results.whatsapp = await sendToGoogleSheet(process.env.WHATSAPP_SHEET_URL, whatsappPayload);
      } catch (err) {
        console.error('[OrderNotification WhatsApp] Error:', err.message);
        results.whatsapp = { error: err.message };
      }
    }
    
    // Send to Email if email available
    if (customerData.email && process.env.EMAIL_SHEET_URL) {
      try {
        const emailPayload = {
          type: type,
          recipient: customerData.email,
          templateData: {
            customerName: customerData.name || 'Valued Customer',
            orderId,
            status: type,
            details: orderDetails || {}
          }
        };
        
        results.email = await sendToGoogleSheet(process.env.EMAIL_SHEET_URL, emailPayload);
      } catch (err) {
        console.error('[OrderNotification Email] Error:', err.message);
        results.email = { error: err.message };
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Order ${type} notification sent`,
      results
    });
    
  } catch (error) {
    console.error('[handleOrderNotification] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * OTP Handler
 * Sends OTP via WhatsApp for verification
 */
export async function handleOTPSend(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { phone, purpose } = body;
    
    // Validate required fields
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    if (!process.env.WHATSAPP_SHEET_URL) {
      return res.status(500).json({ error: 'WhatsApp Sheet URL not configured' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const payload = {
      type: 'otp',
      customerData: {
        phone: phone
      },
      data: {
        otp,
        purpose: purpose || 'verification',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }
    };
    
    const result = await sendToGoogleSheet(process.env.WHATSAPP_SHEET_URL, payload);
    
    // In production, you'd store the OTP hash in DB/Redis for verification
    // For now, we'll just return success (OTP verification would need separate endpoint)
    
    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      sheetResponse: result
      // Note: Don't return OTP in response in production!
    });
    
  } catch (error) {
    console.error('[handleOTPSend] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Promotional Offer Handler
 * Sends promotional offers to customer lists
 */
export async function handlePromotionalOffer(req, res) {
  const method = req.method;
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const body = req.body || {};
    const { campaignName, offerDetails, recipientList } = body;
    
    // Validate required fields
    if (!campaignName || !offerDetails) {
      return res.status(400).json({ error: 'Campaign name and offer details required' });
    }
    
    if (!recipientList || !Array.isArray(recipientList) || recipientList.length === 0) {
      return res.status(400).json({ error: 'Valid recipient list required' });
    }
    
    const results = { sent: 0, failed: 0, errors: [] };
    
    // Process each recipient
    for (const recipient of recipientList) {
      try {
        const payload = {
          type: 'promotional_offer',
          customerData: {
            name: recipient.name || '',
            phone: recipient.phone || '',
            email: recipient.email || ''
          },
          data: {
            campaignName,
            offerDetails,
            sentAt: new Date().toISOString()
          }
        };
        
        // Send to appropriate channel based on available contact info
        const sheetUrl = recipient.phone ? process.env.WHATSAPP_SHEET_URL : process.env.EMAIL_SHEET_URL;
        
        if (sheetUrl) {
          await sendToGoogleSheet(sheetUrl, payload);
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ recipient: recipient.email || recipient.phone, error: 'No sheet URL configured' });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ recipient: recipient.email || recipient.phone, error: err.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `Promotional campaign "${campaignName}" processed`,
      results
    });
    
  } catch (error) {
    console.error('[handlePromotionalOffer] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
