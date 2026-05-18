// api/payment.js - Payment Processing (Vercel Node.js Runtime)
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const params = url.searchParams;
    const amount = params.get('amount');

    // ─── GET: Render payment form ───
    if (req.method === 'GET') {
      if (!amount) {
        return res.status(400).json({ error: 'Amount required' });
      }

      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Processing</title>
          <link rel="stylesheet" href="/css/style.css" />
          <style>
            .payment-container { max-width: 500px; margin: 100px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .payment-form { display: flex; flex-direction: column; gap: 20px; }
            .form-group { display: flex; flex-direction: column; gap: 8px; }
            .form-group label { font-weight: 600; }
            .form-group input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
            .btn-pay { background: #ff6b6b; color: white; padding: 14px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.3s; }
            .btn-pay:hover { background: #ee5a5a; }
            .amount-display { font-size: 1.5rem; font-weight: bold; color: #ff6b6b; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="payment-container">
            <h1>💳 Payment Processing</h1>
            <div class="amount-display">₹${(amount / 100).toFixed(2)}</div>
            <form class="payment-form" id="paymentForm">
              <div class="form-group">
                <label>Card Holder Name</label>
                <input type="text" name="cardholder" required />
              </div>
              <div class="form-group">
                <label>Card Number</label>
                <input type="text" name="cardnumber" placeholder="1234 5678 9012 3456" required />
              </div>
              <div class="form-group">
                <label>Expiry Date (MM/YY)</label>
                <input type="text" name="expiry" placeholder="12/25" required />
              </div>
              <div class="form-group">
                <label>CVV</label>
                <input type="text" name="cvv" placeholder="123" maxlength="3" required />
              </div>
              <button type="submit" class="btn-pay">Pay Now</button>
            </form>
          </div>

          <script>
            document.getElementById('paymentForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              // Get checkout data from sessionStorage
              const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData') || '{}');
              
              try {
                const res = await fetch('/api/payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: ${amount},
                    status: 'success',
                    transactionId: 'txn_' + Date.now(),
                    ...checkoutData
                  })
                });
                
                const result = await res.json();
                if (res.ok && result.order_id) {
                  sessionStorage.removeItem('checkoutData');
                  window.location.href = '/pages/order-success.html?id=' + result.order_id + '&total=${(amount / 100).toFixed(2)}';
                } else {
                  alert('Payment processing failed: ' + (result.error || 'Unknown error'));
                }
              } catch (err) {
                alert('Error: ' + err.message);
              }
            });
          </script>
        </body>
        </html>
      `);
    }

    // ─── POST: Process payment and create order ───
    if (req.method === 'POST') {
      // Parse body (Vercel Node.js runtime auto-parses JSON)
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { amount: bodyAmount, status, transactionId, customer_name, customer_email, customer_phone, customer_address, items, subtotal, tax, shipping, total } = body;

      if (!bodyAmount || !status) {
        return res.status(400).json({ error: 'Missing amount or status' });
      }

      if (status !== 'success') {
        return res.status(400).json({ error: 'Payment failed or cancelled' });
      }

      if (!customer_email || !items?.length) {
        return res.status(400).json({ error: 'Missing customer or items data' });
      }

      const sql = neon(process.env.DATABASE_URL);

      // Create order
      const orderResult = await sql('INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id', [customer_name || null, customer_email, customer_phone || null, customer_address || null, total, 'online', 'pending']);

      if (!orderResult || orderResult.length === 0) {
        return res.status(500).json({ error: 'Failed to create order' });
      }

      const orderId = orderResult[0].id;

      // Insert order items
      for (const item of items) {
        await sql('INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES ($1, $2, $3, $4, $5)', [orderId, item.product_id, item.size || null, item.quantity, item.price]);
      }

      return res.status(201).json({
        success: true,
        order_id: orderId,
        transaction_id: transactionId,
        amount: bodyAmount,
        message: 'Payment successful and order created'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Payment Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

