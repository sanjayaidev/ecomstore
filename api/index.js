// api/index.js - Unified API Router (Single Serverless Function)
import { neon } from '@neondatabase/serverless';

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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============ PRODUCTS HANDLERS ============
async function handleProducts(req, res, sql, params) {
  const method = req.method;
  
  if (method === 'OPTIONS') return res.status(200).end();
  
  if (method === 'GET') {
    let query = sql`SELECT * FROM products WHERE 1=1`;
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
    
    if (conditions.length > 0) query = sql`SELECT * FROM products WHERE ${sql.join(conditions, sql` AND `)}`;
    
    const sort = params.get('sort');
    if (sort === 'newest') query = sql`${query} ORDER BY created_at DESC`;
    else if (sort === 'price_low') query = sql`${query} ORDER BY price ASC`;
    else if (sort === 'price_high') query = sql`${query} ORDER BY price DESC`;
    
    const limit = parseInt(params.get('limit')) || 20;
    query = sql`${query} LIMIT ${limit}`;
    
    const products = await query;
    return json(res, 200, products);
  }
  
  if (method === 'POST') {
    const body = await parseBody(req);
    const { title, description, price, category, image_1, image_2, sizes, discount_price } = body;
    if (!title || !price || !category) return json(res, 400, { error: 'Missing required fields' });
    
    const result = await sql`
      INSERT INTO products (title, description, price, category, image_1, image_2, sizes, discount_price, created_at, updated_at)
      VALUES (${title}, ${description || ''}, ${price}, ${category}, ${image_1 || ''}, ${image_2 || ''}, ${JSON.stringify(sizes || [])}, ${discount_price || null}, NOW(), NOW())
      RETURNING *
    `;
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
        FROM orders o WHERE o.id = ${orderId}
      `;
      if (!orders.length) return json(res, 404, { error: 'Order not found' });
      return json(res, 200, orders[0]);
    }
    
    const orders = await sql`
      SELECT o.*, 
        (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items_detail
      FROM orders o ORDER BY o.created_at DESC
    `;
    return json(res, 200, orders || []);
  }
  
  if (req.method === 'POST') {
    const { customer_name, customer_email, customer_phone, customer_address, items, total, payment_method, notes } = body;
    if (!customer_email || !items?.length || !total) return json(res, 400, { error: 'Missing: customer_email, items, or total' });
    
    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, notes, status, created_at, updated_at)
      VALUES (${customer_name || null}, ${customer_email}, ${customer_phone || null}, ${customer_address || null}, ${total}, ${payment_method || 'cod'}, ${notes || null}, 'pending', NOW(), NOW())
      RETURNING id
    `;
    const orderId = orderResult[0].id;
    
    for (const item of items) {
      await sql`INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (${orderId}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${item.price})`;
    }
    
    const fullOrder = await sql`
      SELECT o.*, 
        (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id) as items_detail
      FROM orders o WHERE o.id = ${orderId}
    `;
    return json(res, 201, fullOrder[0]);
  }
  
  if (req.method === 'PUT') {
    const { id, status, tracking_number, notes } = body;
    if (!id) return json(res, 400, { error: 'Order ID required' });
    
    const updates = [];
    if (status) updates.push(sql`status = ${status}`);
    if (tracking_number) updates.push(sql`tracking_number = ${tracking_number}`);
    if (notes) updates.push(sql`notes = ${notes}`);
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

// ============ PAYMENT HANDLERS ============
async function handlePayment(req, res, sql, params) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const amount = params.get('amount');
  
  if (req.method === 'GET') {
    if (!amount) return json(res, 400, { error: 'Amount required' });
    
    const html = `
      <!DOCTYPE html>
      <html><head><title>Payment Processing</title>
      <style>
        .payment-container { max-width: 500px; margin: 100px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .payment-form { display: flex; flex-direction: column; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-weight: 600; }
        .form-group input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
        .btn-pay { background: #ff6b6b; color: white; padding: 14px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .btn-pay:hover { background: #ee5a5a; }
        .amount-display { font-size: 1.5rem; font-weight: bold; color: #ff6b6b; text-align: center; margin: 20px 0; }
      </style></head>
      <body>
        <div class="payment-container">
          <h1>💳 Payment Processing</h1>
          <div class="amount-display">₹${(amount / 100).toFixed(2)}</div>
          <form class="payment-form" id="paymentForm">
            <div class="form-group"><label>Card Holder Name</label><input type="text" name="cardholder" required /></div>
            <div class="form-group"><label>Card Number</label><input type="text" name="cardnumber" placeholder="1234 5678 9012 3456" required /></div>
            <div class="form-group"><label>Expiry Date (MM/YY)</label><input type="text" name="expiry" placeholder="12/25" required /></div>
            <div class="form-group"><label>CVV</label><input type="text" name="cvv" placeholder="123" maxlength="3" required /></div>
            <button type="submit" class="btn-pay">Pay Now</button>
          </form>
        </div>
        <script>
          document.getElementById('paymentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData') || '{}');
            try {
              const res = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: ${amount}, status: 'success', transactionId: 'txn_' + Date.now(), ...checkoutData })
              });
              const result = await res.json();
              if (res.ok && result.order_id) {
                sessionStorage.removeItem('checkoutData');
                window.location.href = '/pages/order-success.html?id=' + result.order_id + '&total=${(amount / 100).toFixed(2)}';
              } else {
                alert('Payment processing failed: ' + (result.error || 'Unknown error'));
              }
            } catch (err) { alert('Error: ' + err.message); }
          });
        </script>
      </body></html>
    `;
    return res.status(200).send(html);
  }
  
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { amount: bodyAmount, status, transactionId, customer_name, customer_email, customer_phone, customer_address, items, subtotal, tax, shipping, total } = body;
    
    if (!bodyAmount || !status) return json(res, 400, { error: 'Missing amount or status' });
    if (status !== 'success') return json(res, 400, { error: 'Payment failed or cancelled' });
    if (!customer_email || !items?.length) return json(res, 400, { error: 'Missing customer or items data' });
    
    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, status, created_at, updated_at)
      VALUES (${customer_name || null}, ${customer_email}, ${customer_phone || null}, ${customer_address || null}, ${total}, 'online', 'pending', NOW(), NOW())
      RETURNING id
    `;
    if (!orderResult || orderResult.length === 0) return json(res, 500, { error: 'Failed to create order' });
    
    const orderId = orderResult[0].id;
    for (const item of items) {
      await sql`INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (${orderId}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${item.price})`;
    }
    
    return json(res, 201, { success: true, order_id: orderId, transaction_id: transactionId, amount: bodyAmount, message: 'Payment successful and order created' });
  }
  
  return json(res, 405, { error: 'Method not allowed' });
}

// ============ AUTH HANDLERS ============
async function handleAuth(req, res, pathParts) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // /auth/login
  if (pathParts[2] === 'login') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
    
    const body = await parseBody(req);
    const { email, password } = body;
    
    if (email === 'sanjay@mystore.com' && password === 'sanjay@123') {
      return json(res, 200, { success: true, token: 'test-' + Date.now(), user: { email, role: 'admin' } });
    }
    return json(res, 401, { error: 'Invalid credentials' });
  }
  
  return json(res, 404, { error: 'Auth endpoint not found' });
}

// ============ ADMIN HANDLERS ============
async function handleAdmin(req, res, sql, pathParts) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // /admin/products
  if (pathParts[2] === 'products') {
    if (req.method === 'GET') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      const formatted = products.map(p => {
        let sizes = p.sizes, keywords = p.keywords;
        if (typeof sizes === 'string') { try { sizes = JSON.parse(sizes); } catch { sizes = []; } }
        if (typeof keywords === 'string') { try { keywords = JSON.parse(keywords); } catch { keywords = []; } }
        if (!Array.isArray(sizes)) sizes = [];
        if (!Array.isArray(keywords)) keywords = [];
        return { ...p, sizes, keywords };
      });
      return json(res, 200, formatted);
    }
    
    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.title || !body.price || !body.category) return json(res, 400, { error: 'Missing required fields' });
      const sizes = Array.isArray(body.sizes) ? body.sizes : [];
      const keywords = Array.isArray(body.keywords) ? body.keywords : [];
      
      const result = await sql`
        INSERT INTO products (title, description, price, discount_price, category, image_1, image_2, image_3, sizes, keywords, created_at, updated_at)
        VALUES (${body.title}, ${body.description || ''}, ${body.price}, ${body.discount_price || null}, ${body.category}, ${body.image_1 || ''}, ${body.image_2 || ''}, ${body.image_3 || ''}, ${JSON.stringify(sizes)}, ${JSON.stringify(keywords)}, NOW(), NOW())
        RETURNING *
      `;
      return json(res, 201, result[0]);
    }
    
    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!body.id) return json(res, 400, { error: 'Product ID required' });
      const sizes = Array.isArray(body.sizes) ? body.sizes : [];
      const keywords = Array.isArray(body.keywords) ? body.keywords : [];
      
      const result = await sql`
        UPDATE products SET
          title = COALESCE(${body.title}, title),
          description = COALESCE(${body.description}, description),
          price = COALESCE(${body.price}, price),
          discount_price = COALESCE(${body.discount_price}, discount_price),
          category = COALESCE(${body.category}, category),
          image_1 = COALESCE(${body.image_1}, image_1),
          image_2 = COALESCE(${body.image_2}, image_2),
          image_3 = COALESCE(${body.image_3}, image_3),
          sizes = COALESCE(${JSON.stringify(sizes)}, sizes),
          keywords = COALESCE(${JSON.stringify(keywords)}, keywords),
          updated_at = NOW()
        WHERE id = ${body.id}
        RETURNING *
      `;
      if (result.length === 0) return json(res, 404, { error: 'Product not found' });
      return json(res, 200, result[0]);
    }
    
    if (req.method === 'DELETE') {
      const body = await parseBody(req);
      const { id } = body;
      if (!id) return json(res, 400, { error: 'Product ID required' });
      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (result.length === 0) return json(res, 404, { error: 'Product not found' });
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
    const url = req.url || '';
    const match = url.match(/\/(\d+)(?:\?.*)?$/);
    return match ? parseInt(match[1]) : null;
  };
  
  // /cms/content - Get all homepage content
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
  
  // /cms/sliders
  if (pathParts[2] === 'sliders') {
    const urlId = extractId();
    
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_hero_sliders ORDER BY display_order ASC`;
      return json(res, 200, { success: true, data: rows });
    }
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title is required' });
      const row = await sql`
        INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active)
        VALUES (${b.title}, ${b.subtitle||null}, ${b.image_url||null}, ${b.cta_text||null}, ${b.cta_link||null}, ${b.background_color||'#f8f9fa'}, ${b.text_color||'#000000'}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`
        UPDATE cms_hero_sliders SET
          title = COALESCE(${b.title}, title), subtitle = COALESCE(${b.subtitle}, subtitle),
          image_url = COALESCE(${b.image_url}, image_url), cta_text = COALESCE(${b.cta_text}, cta_text),
          cta_link = COALESCE(${b.cta_link}, cta_link), background_color = COALESCE(${b.background_color}, background_color),
          text_color = COALESCE(${b.text_color}, text_color), display_order = COALESCE(${b.display_order}, display_order),
          is_active = COALESCE(${b.is_active}, is_active), updated_at = NOW()
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_hero_sliders WHERE id = ${id}`;
      return json(res, 200, { success: true, message: 'Slider deleted' });
    }
  }
  
  // /cms/categories
  if (pathParts[2] === 'categories') {
    const urlId = extractId();
    
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_categories ORDER BY display_order ASC`;
      return json(res, 200, { success: true, data: rows });
    }
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.name || !b.slug) return json(res, 400, { success: false, error: 'Name and slug required' });
      const row = await sql`
        INSERT INTO cms_categories (name, slug, icon_emoji, image_url, description, display_order, is_active)
        VALUES (${b.name}, ${b.slug}, ${b.icon_emoji||'📂'}, ${b.image_url||null}, ${b.description||null}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`
        UPDATE cms_categories SET
          name = COALESCE(${b.name}, name), slug = COALESCE(${b.slug}, slug),
          icon_emoji = COALESCE(${b.icon_emoji}, icon_emoji), image_url = COALESCE(${b.image_url}, image_url),
          description = COALESCE(${b.description}, description), display_order = COALESCE(${b.display_order}, display_order),
          is_active = COALESCE(${b.is_active}, is_active)
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_categories WHERE id = ${id}`;
      return json(res, 200, { success: true, message: 'Category deleted' });
    }
  }
  
  // /cms/banners
  if (pathParts[2] === 'banners') {
    const urlId = extractId();
    
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_offer_banners ORDER BY display_order ASC`;
      return json(res, 200, { success: true, data: rows });
    }
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title required' });
      const row = await sql`
        INSERT INTO cms_offer_banners (title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order, is_active)
        VALUES (${b.title}, ${b.subtitle||null}, ${b.offer_text||null}, ${b.image_url||null}, ${b.gradient_start||'#667eea'}, ${b.gradient_end||'#764ba2'}, ${b.cta_text||null}, ${b.cta_link||null}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`
        UPDATE cms_offer_banners SET
          title = COALESCE(${b.title}, title), subtitle = COALESCE(${b.subtitle}, subtitle),
          offer_text = COALESCE(${b.offer_text}, offer_text), image_url = COALESCE(${b.image_url}, image_url),
          gradient_start = COALESCE(${b.gradient_start}, gradient_start), gradient_end = COALESCE(${b.gradient_end}, gradient_end),
          cta_text = COALESCE(${b.cta_text}, cta_text), cta_link = COALESCE(${b.cta_link}, cta_link),
          display_order = COALESCE(${b.display_order}, display_order), is_active = COALESCE(${b.is_active}, is_active),
          updated_at = NOW()
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_offer_banners WHERE id = ${id}`;
      return json(res, 200, { success: true, message: 'Banner deleted' });
    }
  }
  
  // /cms/sections
  if (pathParts[2] === 'sections') {
    const urlId = extractId();
    
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_product_sections ORDER BY display_order ASC`;
      return json(res, 200, { success: true, data: rows });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`
        UPDATE cms_product_sections SET
          title = COALESCE(${b.title}, title), subtitle = COALESCE(${b.subtitle}, subtitle),
          section_type = COALESCE(${b.section_type}, section_type), display_order = COALESCE(${b.display_order}, display_order),
          is_active = COALESCE(${b.is_active}, is_active), updated_at = NOW()
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
  }
  
  // /cms/trust-features
  if (pathParts[2] === 'trust-features') {
    const urlId = extractId();
    
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_trust_features ORDER BY display_order ASC`;
      return json(res, 200, { success: true, data: rows });
    }
    if (req.method === 'POST') {
      const b = await parseBody(req);
      if (!b.title) return json(res, 400, { success: false, error: 'Title required' });
      const row = await sql`
        INSERT INTO cms_trust_features (icon_emoji, title, description, display_order, is_active)
        VALUES (${b.icon_emoji||'✓'}, ${b.title}, ${b.description||null}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return json(res, 201, { success: true, data: row[0] });
    }
    if (req.method === 'PUT') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      const b = await parseBody(req);
      const row = await sql`
        UPDATE cms_trust_features SET
          icon_emoji = COALESCE(${b.icon_emoji}, icon_emoji), title = COALESCE(${b.title}, title),
          description = COALESCE(${b.description}, description), display_order = COALESCE(${b.display_order}, display_order),
          is_active = COALESCE(${b.is_active}, is_active)
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return json(res, 404, { success: false, error: 'Not found' });
      return json(res, 200, { success: true, data: row[0] });
    }
    if (req.method === 'DELETE') {
      const id = urlId || (await parseBody(req))?.id;
      if (!id) return json(res, 400, { success: false, error: 'ID required' });
      await sql`DELETE FROM cms_trust_features WHERE id = ${id}`;
      return json(res, 200, { success: true, message: 'Feature deleted' });
    }
  }
  
  // /cms/newsletter
  if (pathParts[2] === 'newsletter') {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_newsletter_settings LIMIT 1`;
      return json(res, 200, { success: true, data: rows[0] || null });
    }
    if (req.method === 'PUT') {
      const b = await parseBody(req);
      const existing = await sql`SELECT id FROM cms_newsletter_settings LIMIT 1`;
      let row;
      if (existing.length) {
        row = await sql`
          UPDATE cms_newsletter_settings SET
            title = COALESCE(${b.title}, title), subtitle = COALESCE(${b.subtitle}, subtitle),
            is_active = COALESCE(${b.is_active}, is_active), updated_at = NOW()
          WHERE id = ${existing[0].id} RETURNING *`;
      } else {
        row = await sql`
          INSERT INTO cms_newsletter_settings (title, subtitle, is_active)
          VALUES (${b.title || 'Subscribe'}, ${b.subtitle || ''}, ${b.is_active !== false})
          RETURNING *`;
      }
      return json(res, 200, { success: true, data: row[0] });
    }
  }
  
  return json(res, 404, { success: false, error: 'CMS endpoint not found' });
}

// ============ MAIN ROUTER ============
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (!process.env.DATABASE_URL) {
    return json(res, 500, { error: 'Database not configured' });
  }
  
  const sql = neon(process.env.DATABASE_URL);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const params = url.searchParams;
  const pathParts = pathname.split('/').filter(Boolean); // ['api', 'products']
  
  try {
    // Route matching
    if (pathParts[0] === 'api') {
      if (pathParts[1] === 'products') return handleProducts(req, res, sql, params);
      if (pathParts[1] === 'orders') return handleOrders(req, res, sql, params);
      if (pathParts[1] === 'payment') return handlePayment(req, res, sql, params);
      if (pathParts[1] === 'auth') return handleAuth(req, res, pathParts);
      if (pathParts[1] === 'admin') return handleAdmin(req, res, sql, pathParts);
      if (pathParts[1] === 'cms') return handleCMS(req, res, sql, pathParts, params);
      if (pathParts[1] === 'login') {
        // Legacy /api/login endpoint
        if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' });
        const body = await parseBody(req);
        const { email, password } = body;
        if (email === 'sanjay@mystore.com' && password === 'sanjay@123') {
          return json(res, 200, { success: true, token: 'test-' + Date.now(), user: { email, role: 'admin' } });
        }
        return json(res, 401, { error: 'Invalid credentials' });
      }
    }
    
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('API Error:', error);
    return json(res, 500, { error: error.message || 'Internal server error' });
  }
}
