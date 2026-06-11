// api/index.js - Unified API Router (Single Serverless Function)
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import {
  handleCoupons,
  validateCoupon,
  handleAbandonedCarts,
  sendRecoveryEmail,
  handleCollections,
  handleCollectionProducts,
  handleLayoutSections,
  reorderLayoutSections,
  bulkSaveLayoutSections,
  handleWebhooks,
  triggerWebhook,
  handleCSVImport
} from './enhanced-features.js';

export const config = { runtime: 'nodejs' };

// Helper to parse JSON body
async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  try {
    if (typeof req.json === 'function') return await req.json();
    return req.body || {};
  } catch {
    return {};
  }
}

// Helper to send JSON response
function json(res, status, data) {
  return res.status(status).json(data);
}

// ============ PRODUCTS HANDLERS ============
async function handleProducts(req, res, sql, params) {
  const method = req.method;
  if (method === 'OPTIONS') return res.status(200).end();

  if (method === 'GET') {
    const conditions = [];
    if (params.get('id')) {
      const id = Number(params.get('id'));
      if (!Number.isNaN(id)) conditions.push(sql`id = ${id}`);
    } else if (params.get('ids')) {
      const ids = params.get('ids').split(',').map(id => Number(id.trim())).filter(id => !Number.isNaN(id));
      if (ids.length > 0) conditions.push(sql`id = ANY(${ids})`);
    }
    if (params.get('category')) conditions.push(sql`category = ${params.get('category')}`);
    if (params.get('keywords')) {
      const kw = `%${params.get('keywords')}%`;
      conditions.push(sql`(title ILIKE ${kw} OR description ILIKE ${kw})`);
    }

    let query = conditions.length > 0
      ? sql`SELECT * FROM products WHERE ${sql.join(conditions, sql` AND `)}`
      : sql`SELECT * FROM products`;

    const sort = params.get('sort');
    if (sort === 'newest')     query = sql`${query} ORDER BY created_at DESC`;
    else if (sort === 'price_low')  query = sql`${query} ORDER BY price ASC`;
    else if (sort === 'price_high') query = sql`${query} ORDER BY price DESC`;

    const limit = parseInt(params.get('limit')) || 20;
    query = sql`${query} LIMIT ${limit}`;
    return json(res, 200, await query);
  }

  if (method === 'POST') {
    const body = await parseBody(req);
    const { title, description, price, category, image_1, image_2, sizes, discount_price } = body;
    if (!title || !price || !category) return json(res, 400, { error: 'Missing required fields' });
    const result = await sql`
      INSERT INTO products (title, description, price, category, image_1, image_2, sizes, discount_price, created_at, updated_at)
      VALUES (${title}, ${description || ''}, ${price}, ${category}, ${image_1 || ''}, ${image_2 || ''}, ${JSON.stringify(sizes || [])}, ${discount_price || null}, NOW(), NOW())
      RETURNING *`;
    return json(res, 201, result[0]);
  }

  return json(res, 405, { error: 'Method not allowed' });
}

// ============ ORDERS HANDLERS ============
async function handleOrders(req, res, sql, params) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const body = await parseBody(req);

  if (req.method === 'GET') {
    const orderId = params.get('id');
    if (orderId) {
      const orders = await sql`
        SELECT o.*,
          (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
           FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items_detail
        FROM orders o WHERE o.id = ${orderId}`;
      if (!orders.length) return json(res, 404, { error: 'Order not found' });
      return json(res, 200, orders[0]);
    }
    const orders = await sql`
      SELECT o.*,
        (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items_detail
      FROM orders o ORDER BY o.created_at DESC`;
    return json(res, 200, orders || []);
  }

  if (req.method === 'POST') {
    const { customer_name, customer_email, customer_phone, customer_address, items, total, payment_method, notes } = body;
    if (!customer_email || !items?.length || !total) return json(res, 400, { error: 'Missing: customer_email, items, or total' });
    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, notes, status, created_at, updated_at)
      VALUES (${customer_name || null}, ${customer_email}, ${customer_phone || null}, ${customer_address || null}, ${total}, ${payment_method || 'cod'}, ${notes || null}, 'pending', NOW(), NOW())
      RETURNING id`;
    const orderId = orderResult[0].id;
    for (const item of items) {
      await sql`INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (${orderId}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${item.price})`;
    }
    const fullOrder = await sql`
      SELECT o.*,
        (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items_detail
      FROM orders o WHERE o.id = ${orderId}`;
    return json(res, 201, fullOrder[0]);
  }

  if (req.method === 'PUT') {
    const { id, status, tracking_number, notes } = body;
    if (!id) return json(res, 400, { error: 'Order ID required' });
    const updates = [];
    if (status)          updates.push(sql`status = ${status}`);
    if (tracking_number) updates.push(sql`tracking_number = ${tracking_number}`);
    if (notes)           updates.push(sql`notes = ${notes}`);
    updates.push(sql`updated_at = NOW()`);
    const result = await sql`UPDATE orders SET ${sql.join(updates, sql`, `)} WHERE id = ${id} RETURNING *`;
    if (!result?.length) return json(res, 404, { error: 'Order not found' });
    return json(res, 200, result[0]);
  }

  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return json(res, 400, { error: 'Order ID required' });
    const result = await sql`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} RETURNING id`;
    if (!result?.length) return json(res, 404, { error: 'Order not found' });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

// ============ RAZORPAY PAYMENT HANDLERS ============

function razorpayAuth() {
  const id  = process.env.RAZORPAY_KEY_ID;
  const sec = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !sec) throw new Error('Razorpay credentials not configured');
  return 'Basic ' + Buffer.from(`${id}:${sec}`).toString('base64');
}

async function razorpayRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: razorpayAuth() }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.description || `Razorpay error ${res.status}`);
  return data;
}

async function calculateServerTotal(sql, items) {
  let subtotal = 0;
  for (const item of items) {
    const rows = await sql`SELECT price, discount_price FROM products WHERE id = ${item.product_id}`;
    if (!rows.length) throw new Error(`Product ${item.product_id} not found`);
    const unit = Number(rows[0].discount_price || rows[0].price);
    subtotal += unit * item.quantity;
  }
  const shipping = subtotal >= 999 ? 0 : 100;
  const tax      = Math.round(subtotal * 0.10);
  const total    = Math.round(subtotal + tax + shipping);
  return { subtotal: Math.round(subtotal), tax, shipping, total };
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

async function handlePayment(req, res, sql, params) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pathname = (req.url || '').split('?')[0];
  const subRoute = pathname.replace(/^.*\/payment/, '') || '/';

  // ── GET /api/payment/config ── returns public key
  if (req.method === 'GET' && subRoute === '/config') {
    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) return json(res, 500, { error: 'Razorpay not configured' });
    return json(res, 200, { key });
  }

  // ── POST /api/payment/create ── create Razorpay order
  if (req.method === 'POST' && (subRoute === '/create' || subRoute === '/')) {
    const body = await parseBody(req);
    const {
      customer_name, customer_email, customer_phone,
      customer_address, items
    } = body || {};

    if (!customer_email || !customer_email.includes('@'))
      return json(res, 400, { error: 'Valid email required' });
    if (!customer_phone)
      return json(res, 400, { error: 'Phone number required' });
    if (!Array.isArray(items) || !items.length)
      return json(res, 400, { error: 'Cart is empty' });

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1)
        return json(res, 400, { error: 'Invalid cart item' });
    }

    try {
      const { subtotal, tax, shipping, total } = await calculateServerTotal(sql, items);

      // Create DB order first (status: 'created' = awaiting payment)
      const [dbOrder] = await sql`
        INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, status, created_at, updated_at)
        VALUES (${customer_name || null}, ${customer_email}, ${customer_phone}, ${customer_address || null}, ${total}, 'online', 'created', NOW(), NOW())
        RETURNING id`;

      for (const item of items) {
        const [prod] = await sql`SELECT price, discount_price FROM products WHERE id = ${item.product_id}`;
        const unit = Number(prod.discount_price || prod.price);
        await sql`INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (${dbOrder.id}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${unit})`;
      }

      // Create Razorpay order
      const rzOrder = await razorpayRequest('/orders', 'POST', {
        amount:   total * 100,
        currency: 'INR',
        receipt:  String(dbOrder.id),
        notes: {
          db_order_id:    String(dbOrder.id),
          customer_email: customer_email,
          customer_name:  customer_name || ''
        }
      });

      // Save Razorpay order ID for webhook lookup
      await sql`UPDATE orders SET payment_reference = ${rzOrder.id}, updated_at = NOW() WHERE id = ${dbOrder.id}`;

      return json(res, 200, {
        razorpay_order_id: rzOrder.id,
        amount:            total * 100,
        currency:          'INR',
        key:               process.env.RAZORPAY_KEY_ID,
        db_order_id:       dbOrder.id,
        breakdown:         { subtotal, tax, shipping, total }
      });
    } catch (err) {
      console.error('[payment/create]', err.message);
      return json(res, 500, { error: err.message || 'Failed to create payment order' });
    }
  }

  // ── POST /api/payment/verify ── verify HMAC after frontend success
  if (req.method === 'POST' && subRoute === '/verify') {
    const body = await parseBody(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, db_order_id } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !db_order_id)
      return json(res, 400, { error: 'Missing verification fields' });

    try {
      const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!valid) {
        await sql`UPDATE orders SET status = 'payment_failed', updated_at = NOW() WHERE id = ${db_order_id}`;
        return json(res, 400, { error: 'Payment signature invalid — possible tampered request' });
      }

      await sql`
        UPDATE orders
        SET status = 'pending', payment_reference = ${razorpay_payment_id}, updated_at = NOW()
        WHERE id = ${db_order_id}`;

      return json(res, 200, { success: true, order_id: db_order_id });
    } catch (err) {
      console.error('[payment/verify]', err.message);
      return json(res, 500, { error: 'Verification error' });
    }
  }

  // ── POST /api/payment/webhook ── Razorpay server → server (backup confirmation)
  // Register this URL in Razorpay Dashboard → Settings → Webhooks
  if (req.method === 'POST' && subRoute === '/webhook') {
    const rawBody = JSON.stringify(await parseBody(req));
    const sig     = req.headers['x-razorpay-signature'];

    if (!sig || !process.env.RAZORPAY_WEBHOOK_SECRET)
      return json(res, 400, { error: 'Missing signature' });

    if (!verifyWebhookSignature(rawBody, sig)) {
      console.warn('[webhook] Invalid signature');
      return json(res, 400, { error: 'Invalid signature' });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch { return json(res, 400, { error: 'Bad JSON' }); }

    const eventType = event.event;
    const payment   = event.payload?.payment?.entity;
    const rzOrderId = payment?.order_id;

    try {
      if ((eventType === 'payment.captured' || eventType === 'order.paid') && rzOrderId) {
        await sql`
          UPDATE orders SET status = 'pending', updated_at = NOW()
          WHERE payment_reference = ${rzOrderId} AND status IN ('created', 'payment_failed')`;
      }
      if (eventType === 'payment.failed' && rzOrderId) {
        await sql`
          UPDATE orders SET status = 'payment_failed', updated_at = NOW()
          WHERE payment_reference = ${rzOrderId} AND status = 'created'`;
      }
      // Always 200 so Razorpay stops retrying
      return json(res, 200, { received: true });
    } catch (err) {
      console.error('[webhook]', err.message);
      return json(res, 200, { received: true });
    }
  }

  return json(res, 404, { error: 'Payment endpoint not found' });
}

// ============ CASHFREE PAYMENT HANDLERS ============

function cashfreeAuth() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) throw new Error('Cashfree credentials not configured');
  return { appId, secretKey };
}

async function cashfreeRequest(path, method = 'GET', body = null) {
  const { appId, secretKey } = cashfreeAuth();
  const opts = {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'x-api-version': '2023-12-21',
      'x-client-id': appId,
      'x-client-secret': secretKey
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://sandbox.cashfree.com${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Cashfree error ${res.status}`);
  return data;
}

function verifyCashfreeSignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
    .update(`${orderId}${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch { return false; }
}

async function handleCashfreePayment(req, res, sql, params) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pathname = (req.url || '').split('?')[0];
  const subRoute = pathname.replace(/^.*\/cashfree/, '') || '/';

  // ── GET /api/payment/cashfree/config ── returns app ID
  if (req.method === 'GET' && subRoute === '/config') {
    const appId = process.env.CASHFREE_APP_ID;
    if (!appId) return json(res, 500, { error: 'Cashfree not configured' });
    return json(res, 200, { appId, environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' });
  }

  // ── POST /api/payment/cashfree/create ── create Cashfree order
  if (req.method === 'POST' && (subRoute === '/create' || subRoute === '/')) {
    const body = await parseBody(req);
    const {
      customer_name, customer_email, customer_phone,
      customer_address, items
    } = body || {};

    if (!customer_email || !customer_email.includes('@'))
      return json(res, 400, { error: 'Valid email required' });
    if (!customer_phone)
      return json(res, 400, { error: 'Phone number required' });
    if (!Array.isArray(items) || !items.length)
      return json(res, 400, { error: 'Cart is empty' });

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1)
        return json(res, 400, { error: 'Invalid cart item' });
    }

    try {
      const { subtotal, tax, shipping, total } = await calculateServerTotal(sql, items);

      // Create DB order first (status: 'created' = awaiting payment)
      const [dbOrder] = await sql`
        INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, status, created_at, updated_at)
        VALUES (${customer_name || null}, ${customer_email}, ${customer_phone}, ${customer_address || null}, ${total}, 'online', 'created', NOW(), NOW())
        RETURNING id`;

      for (const item of items) {
        const [prod] = await sql`SELECT price, discount_price FROM products WHERE id = ${item.product_id}`;
        const unit = Number(prod.discount_price || prod.price);
        await sql`INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (${dbOrder.id}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${unit})`;
      }

      // Create Cashfree order
      const cfOrder = await cashfreeRequest('/orders', 'POST', {
        order_id: `CF-${dbOrder.id}-${Date.now()}`,
        order_amount: total,
        currency: 'INR',
        customer_details: {
          customer_id: `CUST-${dbOrder.id}`,
          customer_name: customer_name || '',
          customer_email: customer_email,
          customer_phone: customer_phone
        },
        order_meta: {
          return_url: `${process.env.BASE_URL || 'http://localhost:3000'}/pages/order-success.html?order_id=${dbOrder.id}&cf_order_id={order_id}`,
          notify_webhook: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/cashfree/webhook`
        }
      });

      // Save Cashfree order ID for webhook lookup
      await sql`UPDATE orders SET payment_reference = ${cfOrder.order_id}, updated_at = NOW() WHERE id = ${dbOrder.id}`;

      return json(res, 200, {
        cashfree_order_id: cfOrder.payment_session_id,
        orderId: cfOrder.order_id,
        amount: total,
        currency: 'INR',
        db_order_id: dbOrder.id,
        breakdown: { subtotal, tax, shipping, total }
      });
    } catch (err) {
      console.error('[cashfree/create]', err.message);
      return json(res, 500, { error: err.message || 'Failed to create Cashfree payment order' });
    }
  }

  // ── POST /api/payment/cashfree/verify ── verify payment after frontend success
  if (req.method === 'POST' && subRoute === '/verify') {
    const body = await parseBody(req);
    const { cf_order_id, reference_id, payment_status, db_order_id } = body || {};

    if (!cf_order_id || !reference_id || !db_order_id)
      return json(res, 400, { error: 'Missing verification fields' });

    try {
      // Fetch order status from Cashfree
      const cfOrderStatus = await cashfreeRequest(`/orders/${cf_order_id}/payments`, 'GET');
      
      const isPaid = payment_status === 'SUCCESS' || (cfOrderStatus.payments && cfOrderStatus.payments.some(p => p.payment_status === 'SUCCESS'));
      
      if (!isPaid) {
        await sql`UPDATE orders SET status = 'payment_failed', updated_at = NOW() WHERE id = ${db_order_id}`;
        return json(res, 400, { error: 'Payment not successful' });
      }

      await sql`
        UPDATE orders
        SET status = 'pending', payment_reference = ${cf_order_id}, updated_at = NOW()
        WHERE id = ${db_order_id}`;

      return json(res, 200, { success: true, order_id: db_order_id });
    } catch (err) {
      console.error('[cashfree/verify]', err.message);
      return json(res, 500, { error: 'Verification error' });
    }
  }

  // ── POST /api/payment/cashfree/webhook ── Cashfree server → server (backup confirmation)
  if (req.method === 'POST' && subRoute === '/webhook') {
    const rawBody = JSON.stringify(await parseBody(req));
    const sig     = req.headers['x-cf-signature'];

    if (!sig) {
      console.warn('[cashfree webhook] Missing signature');
      return json(res, 400, { error: 'Missing signature' });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch { return json(res, 400, { error: 'Bad JSON' }); }

    const cfOrderId = event.order_id || event.data?.order_id;

    try {
      if (event.event === 'order.paid' || event.event === 'payment.success') {
        await sql`
          UPDATE orders SET status = 'pending', updated_at = NOW()
          WHERE payment_reference = ${cfOrderId} AND status IN ('created', 'payment_failed')`;
      }
      if (event.event === 'payment.failed' || event.event === 'order.expired') {
        await sql`
          UPDATE orders SET status = 'payment_failed', updated_at = NOW()
          WHERE payment_reference = ${cfOrderId} AND status = 'created'`;
      }
      return json(res, 200, { received: true });
    } catch (err) {
      console.error('[cashfree webhook]', err.message);
      return json(res, 200, { received: true });
    }
  }

  return json(res, 404, { error: 'Cashfree payment endpoint not found' });
}

// ============ AUTH HANDLERS ============
async function handleAuth(req, res, pathParts) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (pathParts[2] === 'login') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    const body = await parseBody(req);
    const { email, password } = body;
    if (email === 'sanjay@mystore.com' && password === 'sanjay@123')
      return json(res, 200, { success: true, token: 'test-' + Date.now(), user: { email, role: 'admin' } });
    return json(res, 401, { error: 'Invalid credentials' });
  }
  return json(res, 404, { error: 'Auth endpoint not found' });
}

// ============ ADMIN HANDLERS ============
async function handleAdmin(req, res, sql, pathParts) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (pathParts[2] === 'products') {
    if (req.method === 'GET') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      return json(res, 200, products.map(p => {
        let sizes = p.sizes, keywords = p.keywords;
        if (typeof sizes === 'string') { try { sizes = JSON.parse(sizes); } catch { sizes = []; } }
        if (typeof keywords === 'string') { try { keywords = JSON.parse(keywords); } catch { keywords = []; } }
        if (!Array.isArray(sizes)) sizes = [];
        if (!Array.isArray(keywords)) keywords = [];
        return { ...p, sizes, keywords };
      }));
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.title || !body.price || !body.category) return json(res, 400, { error: 'Missing required fields' });
      const sizes = Array.isArray(body.sizes) ? body.sizes : [];
      const keywords = Array.isArray(body.keywords) ? body.keywords : [];
      const result = await sql`
        INSERT INTO products (title, description, price, discount_price, category, image_1, image_2, image_3, sizes, keywords, created_at, updated_at)
        VALUES (${body.title}, ${body.description || ''}, ${body.price}, ${body.discount_price || null}, ${body.category}, ${body.image_1 || ''}, ${body.image_2 || ''}, ${body.image_3 || ''}, ${JSON.stringify(sizes)}, ${JSON.stringify(keywords)}, NOW(), NOW())
        RETURNING *`;
      return json(res, 201, result[0]);
    }
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!body.id) return json(res, 400, { error: 'Product ID required' });
      const sizes = Array.isArray(body.sizes) ? body.sizes : [];
      const keywords = Array.isArray(body.keywords) ? body.keywords : [];
      const result = await sql`
        UPDATE products SET
          title = COALESCE(${body.title}, title), description = COALESCE(${body.description}, description),
          price = COALESCE(${body.price}, price), discount_price = COALESCE(${body.discount_price}, discount_price),
          category = COALESCE(${body.category}, category), image_1 = COALESCE(${body.image_1}, image_1),
          image_2 = COALESCE(${body.image_2}, image_2), image_3 = COALESCE(${body.image_3}, image_3),
          sizes = COALESCE(${JSON.stringify(sizes)}, sizes), keywords = COALESCE(${JSON.stringify(keywords)}, keywords),
          updated_at = NOW()
        WHERE id = ${body.id} RETURNING *`;
      if (!result.length) return json(res, 404, { error: 'Product not found' });
      return json(res, 200, result[0]);
    }
    if (req.method === 'DELETE') {
      const body = await parseBody(req);
      if (!body.id) return json(res, 400, { error: 'Product ID required' });
      const result = await sql`DELETE FROM products WHERE id = ${body.id} RETURNING id`;
      if (!result.length) return json(res, 404, { error: 'Product not found' });
      return json(res, 200, { success: true });
    }
    return json(res, 405, { error: 'Method not allowed' });
  }
  return json(res, 404, { error: 'Admin endpoint not found' });
}

// ============ CMS HANDLERS ============
async function handleCMS(req, res, sql, pathParts, params) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const extractId = () => {
    const match = (req.url || '').match(/\/(\d+)(?:\?.*)?$/);
    return match ? parseInt(match[1]) : null;
  };

  if (pathParts[2] === 'content' && req.method === 'GET') {
    const [sliders, categories, banners, sections, trustFeatures, newsletter] = await Promise.all([
      sql`SELECT * FROM cms_hero_sliders ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_categories ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_offer_banners ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_product_sections ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_trust_features ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_newsletter_settings LIMIT 1`
    ]);
    return json(res, 200, { success: true, data: { sliders, categories, banners, sections, trustFeatures, newsletter: newsletter[0] || null } });
  }

  if (pathParts[2] === 'sliders') {
    const urlId = extractId();
    if (req.method === 'GET') return json(res, 200, { success: true, data: await sql`SELECT * FROM cms_hero_sliders ORDER BY display_order ASC` });
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title required' });
      const row = await sql`INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active) VALUES (${b.title}, ${b.subtitle||null}, ${b.image_url||null}, ${b.cta_text||null}, ${b.cta_link||null}, ${b.background_color||'#f8f9fa'}, ${b.text_color||'#000000'}, ${b.display_order||0}, ${b.is_active !== false}) RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`UPDATE cms_hero_sliders SET title=COALESCE(${b.title},title), subtitle=COALESCE(${b.subtitle},subtitle), image_url=COALESCE(${b.image_url},image_url), cta_text=COALESCE(${b.cta_text},cta_text), cta_link=COALESCE(${b.cta_link},cta_link), background_color=COALESCE(${b.background_color},background_color), text_color=COALESCE(${b.text_color},text_color), display_order=COALESCE(${b.display_order},display_order), is_active=COALESCE(${b.is_active},is_active), updated_at=NOW() WHERE id=${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_hero_sliders WHERE id=${id}`;
      return json(res, 200, { success: true });
    }
  }

  if (pathParts[2] === 'categories') {
    const urlId = extractId();
    if (req.method === 'GET') return json(res, 200, { success: true, data: await sql`SELECT * FROM cms_categories ORDER BY display_order ASC` });
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.name || !b.slug) return json(res, 400, { success: false, error: 'Name and slug required' });
      const row = await sql`INSERT INTO cms_categories (name, slug, icon_emoji, image_url, description, display_order, is_active) VALUES (${b.name}, ${b.slug}, ${b.icon_emoji||'📂'}, ${b.image_url||null}, ${b.description||null}, ${b.display_order||0}, ${b.is_active !== false}) RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`UPDATE cms_categories SET name=COALESCE(${b.name},name), slug=COALESCE(${b.slug},slug), icon_emoji=COALESCE(${b.icon_emoji},icon_emoji), image_url=COALESCE(${b.image_url},image_url), description=COALESCE(${b.description},description), display_order=COALESCE(${b.display_order},display_order), is_active=COALESCE(${b.is_active},is_active) WHERE id=${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_categories WHERE id=${id}`;
      return json(res, 200, { success: true });
    }
  }

  if (pathParts[2] === 'banners') {
    const urlId = extractId();
    if (req.method === 'GET') return json(res, 200, { success: true, data: await sql`SELECT * FROM cms_offer_banners ORDER BY display_order ASC` });
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title required' });
      const row = await sql`INSERT INTO cms_offer_banners (title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order, is_active) VALUES (${b.title}, ${b.subtitle||null}, ${b.offer_text||null}, ${b.image_url||null}, ${b.gradient_start||'#667eea'}, ${b.gradient_end||'#764ba2'}, ${b.cta_text||null}, ${b.cta_link||null}, ${b.display_order||0}, ${b.is_active !== false}) RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`UPDATE cms_offer_banners SET title=COALESCE(${b.title},title), subtitle=COALESCE(${b.subtitle},subtitle), offer_text=COALESCE(${b.offer_text},offer_text), image_url=COALESCE(${b.image_url},image_url), gradient_start=COALESCE(${b.gradient_start},gradient_start), gradient_end=COALESCE(${b.gradient_end},gradient_end), cta_text=COALESCE(${b.cta_text},cta_text), cta_link=COALESCE(${b.cta_link},cta_link), display_order=COALESCE(${b.display_order},display_order), is_active=COALESCE(${b.is_active},is_active), updated_at=NOW() WHERE id=${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_offer_banners WHERE id=${id}`;
      return json(res, 200, { success: true });
    }
  }

  if (pathParts[2] === 'sections') {
    const urlId = extractId();
    if (req.method === 'GET') return json(res, 200, { success: true, data: await sql`SELECT * FROM cms_product_sections ORDER BY display_order ASC` });
    if (req.method === 'POST') {
      const b = await parseBody(req);
      const row = await sql`INSERT INTO cms_product_sections (title, subtitle, section_type, display_order, is_active, created_at, updated_at) VALUES (${b.title||''}, ${b.subtitle||''}, ${b.section_type||'featured'}, ${b.display_order||0}, ${b.is_active !== false}, NOW(), NOW()) RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`UPDATE cms_product_sections SET title=COALESCE(${b.title},title), subtitle=COALESCE(${b.subtitle},subtitle), section_type=COALESCE(${b.section_type},section_type), display_order=COALESCE(${b.display_order},display_order), is_active=COALESCE(${b.is_active},is_active), updated_at=NOW() WHERE id=${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
  }

  if (pathParts[2] === 'trust-features') {
    const urlId = extractId();
    if (req.method === 'GET') return json(res, 200, { success: true, data: await sql`SELECT * FROM cms_trust_features ORDER BY display_order ASC` });
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title required' });
      const row = await sql`INSERT INTO cms_trust_features (icon_emoji, title, description, display_order, is_active) VALUES (${b.icon_emoji||'✓'}, ${b.title}, ${b.description||null}, ${b.display_order||0}, ${b.is_active !== false}) RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`UPDATE cms_trust_features SET icon_emoji=COALESCE(${b.icon_emoji},icon_emoji), title=COALESCE(${b.title},title), description=COALESCE(${b.description},description), display_order=COALESCE(${b.display_order},display_order), is_active=COALESCE(${b.is_active},is_active) WHERE id=${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_trust_features WHERE id=${id}`;
      return json(res, 200, { success: true });
    }
  }

  if (pathParts[2] === 'newsletter') {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_newsletter_settings LIMIT 1`;
      return json(res, 200, { success: true, data: rows[0] || null });
    }
    if (req.method === 'PUT') {
      const b = await parseBody(req);
      const existing = await sql`SELECT id FROM cms_newsletter_settings LIMIT 1`;
      const row = existing.length
        ? await sql`UPDATE cms_newsletter_settings SET title=COALESCE(${b.title},title), subtitle=COALESCE(${b.subtitle},subtitle), is_active=COALESCE(${b.is_active},is_active), updated_at=NOW() WHERE id=${existing[0].id} RETURNING *`
        : await sql`INSERT INTO cms_newsletter_settings (title, subtitle, is_active) VALUES (${b.title||'Subscribe'}, ${b.subtitle||''}, ${b.is_active !== false}) RETURNING *`;
      return json(res, 200, { success: true, data: row[0] });
    }
  }

  return json(res, 404, { success: false, error: 'CMS endpoint not found' });
}

// ============ MAIN ROUTER ============
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.DATABASE_URL) return json(res, 500, { error: 'Database not configured' });

  const sql      = neon(process.env.DATABASE_URL);
  const url      = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const params   = url.searchParams;
  const pathParts = pathname.split('/').filter(Boolean);

  try {
    if (pathParts[0] === 'api') {
      if (pathParts[1] === 'products') return handleProducts(req, res, sql, params);
      if (pathParts[1] === 'orders')   return handleOrders(req, res, sql, params);
      if (pathParts[1] === 'payment')  return handlePayment(req, res, sql, params);
      // Cashfree payment routes under /api/payment/cashfree/*
      if (pathParts[1] === 'payment' && pathParts[2] === 'cashfree') return handleCashfreePayment(req, res, sql, params);
      if (pathParts[1] === 'auth')     return handleAuth(req, res, pathParts);
      if (pathParts[1] === 'admin')    return handleAdmin(req, res, sql, pathParts);
      if (pathParts[1] === 'cms')      return handleCMS(req, res, sql, pathParts, params);
      // Enhanced Features Routes
      if (pathParts[1] === 'coupons') {
        if (pathParts[2] === 'validate') return validateCoupon(req, res, sql);
        return handleCoupons(req, res, sql, params);
      }
      if (pathParts[1] === 'abandoned-carts') {
        if (pathParts[2] === 'send-recovery') return sendRecoveryEmail(req, res, sql);
        return handleAbandonedCarts(req, res, sql, params);
      }
      if (pathParts[1] === 'collections') {
        if (pathParts[2] === 'products') return handleCollectionProducts(req, res, sql);
        return handleCollections(req, res, sql, params);
      }
      if (pathParts[1] === 'layout-sections') {
        if (pathParts[2] === 'reorder') return reorderLayoutSections(req, res, sql);
        if (pathParts[2] === 'bulk') return bulkSaveLayoutSections(req, res, sql);
        return handleLayoutSections(req, res, sql, params);
      }
      if (pathParts[1] === 'webhooks') return handleWebhooks(req, res, sql, params);
      if (pathParts[1] === 'csv-import') return handleCSVImport(req, res, sql);
      
      // Customer accounts endpoint
      if (pathParts[1] === 'customers') {
        const customerId = params.get('id') || pathParts[2];
        if (req.method === 'GET' && customerId) {
          const users = await sql`SELECT id, name, email, phone, address, city, pincode, created_at FROM users WHERE id = ${parseInt(customerId)}`;
          if (!users.length) return json(res, 404, { error: 'Customer not found' });
          return json(res, 200, users[0]);
        }
        if (req.method === 'PUT' && customerId) {
          const body = await parseBody(req);
          const clauses = ['updated_at = NOW()'];
          if (body.name !== undefined) clauses.push(`name = '${body.name}'`);
          if (body.email !== undefined) clauses.push(`email = '${body.email}'`);
          if (body.phone !== undefined) clauses.push(`phone = '${body.phone}'`);
          if (body.address !== undefined) clauses.push(`address = '${body.address}'`);
          if (body.city !== undefined) clauses.push(`city = '${body.city}'`);
          if (body.pincode !== undefined) clauses.push(`pincode = '${body.pincode}'`);
          const result = await sql`UPDATE users SET ${sql.join(clauses.map(c=>sql.raw(c)), sql`, `)} WHERE id = ${parseInt(customerId)} RETURNING id, name, email, phone, address, city, pincode`;
          if (!result.length) return json(res, 404, { error: 'Customer not found' });
          return json(res, 200, result[0]);
        }
        return json(res, 400, { error: 'Invalid request' });
      }
      
      if (pathParts[1] === 'login') {
        if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
        const body = await parseBody(req);
        if (body.email === 'sanjay@mystore.com' && body.password === 'sanjay@123')
          return json(res, 200, { success: true, token: 'test-' + Date.now(), user: { email: body.email, role: 'admin' } });
        return json(res, 401, { error: 'Invalid credentials' });
      }
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    return json(res, 500, { error: error.message || 'Internal server error' });
  }
}
