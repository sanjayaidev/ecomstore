/**
 * Enhanced E-commerce Features API Module
 */
import crypto from 'crypto';

async function parseBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  try { return typeof req.json === 'function' ? await req.json() : req.body || {}; }
  catch { return {}; }
}

export async function handleCoupons(req, res, sql, params) {
  const method = req.method;
  if (method === 'GET') {
    const id = params.get('id');
    const active = params.get('active');
    
    if (id) {
      const coupons = await sql`SELECT * FROM coupons WHERE id = ${Number(id)}`;
      if (!coupons.length) return res.status(404).json({ error: 'Coupon not found' });
      return res.status(200).json(coupons[0]);
    }
    
    // Filter by active status if provided
    let query;
    if (active === 'true') {
      query = sql`SELECT * FROM coupons WHERE is_active = true ORDER BY created_at DESC`;
    } else {
      query = sql`SELECT * FROM coupons ORDER BY created_at DESC`;
    }
    return res.status(200).json(await query);
  }
  if (method === 'POST') {
    const b = await parseBody(req);
    if (!b.code || !b.discount_type || !b.discount_value) return res.status(400).json({ error: 'Missing required fields' });
    const r = await sql`INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, applicable_categories, applicable_products, buy_quantity, get_quantity, bundle_products, is_active, created_at, updated_at) VALUES (${b.code.toUpperCase()}, ${b.description||''}, ${b.discount_type}, ${b.discount_value}, ${b.min_order_amount||0}, ${b.max_discount_amount||null}, ${b.usage_limit||null}, ${b.valid_from||new Date()}, ${b.valid_until||null}, ${b.applicable_categories?JSON.stringify(b.applicable_categories):null}, ${b.applicable_products?JSON.stringify(b.applicable_products):null}, ${b.buy_quantity||0}, ${b.get_quantity||0}, ${b.bundle_products?JSON.stringify(b.bundle_products):null}, true, NOW(), NOW()) RETURNING *`;
    return res.status(201).json(r[0]);
  }
  if (method === 'PUT') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    const clauses = ['updated_at = NOW()'];
    ['code','description','discount_type','discount_value','min_order_amount','max_discount_amount','usage_limit','valid_from','valid_until','buy_quantity','get_quantity','is_active'].forEach(k => { if (b[k] !== undefined) clauses.push(`${k} = ${typeof b[k]==='string'?`'${b[k]}'`:Array.isArray(b[k])?`'${JSON.stringify(b[k])}'`:b[k]}`); });
    const r = await sql`UPDATE coupons SET ${sql.join(clauses.map(c=>sql.raw(c)), sql`, `)} WHERE id = ${b.id} RETURNING *`;
    if (!r.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(r[0]);
  }
  if (method === 'DELETE') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    await sql`UPDATE coupons SET is_active = false, updated_at = NOW() WHERE id = ${b.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function validateCoupon(req, res, sql) {
  const b = await parseBody(req);
  if (!b.code || !b.cart_items) return res.status(400).json({ error: 'Code and cart_items required' });
  const coupons = await sql`SELECT * FROM coupons WHERE code = ${b.code.toUpperCase()} AND is_active = true`;
  if (!coupons.length) return res.status(404).json({ error: 'Invalid coupon code', valid: false });
  const c = coupons[0], now = new Date();
  if (new Date(c.valid_from) > now || (c.valid_until && new Date(c.valid_until) < now)) return res.status(400).json({ error: 'Coupon expired', valid: false });
  if (c.usage_limit && c.usage_count >= c.usage_limit) return res.status(400).json({ error: 'Usage limit reached', valid: false });
  if (b.subtotal < c.min_order_amount) return res.status(400).json({ error: `Min order ₹${c.min_order_amount} required`, valid: false });
  let discount = 0;
  if (c.discount_type === 'percentage') { discount = b.subtotal * (c.discount_value / 100); if (c.max_discount_amount) discount = Math.min(discount, c.max_discount_amount); }
  else if (c.discount_type === 'fixed') discount = c.discount_value;
  else if (c.discount_type === 'buy_x_get_y') {
    const sorted = [...b.cart_items].sort((a,b)=>a.price-b.price), freeItems = Math.floor(b.cart_items.reduce((s,i)=>s+i.quantity,0)/(c.buy_quantity+c.get_quantity))*c.get_quantity;
    let fv=0, cnt=0; for (const it of sorted) { if (cnt>=freeItems) break; fv+=it.price; cnt++; } discount = fv;
  } else if (c.discount_type === 'bundle') discount = c.discount_value;
  discount = Math.round(discount*100)/100;
  return res.status(200).json({ valid: true, coupon: { code: c.code, discount_type: c.discount_type, discount_value: c.discount_value }, discount, final_total: Math.max(0, b.subtotal-discount) });
}

export async function handleAbandonedCarts(req, res, sql, params) {
  const method = req.method;
  if (method === 'GET') {
    const id = params.get('id');
    if (id) {
      const carts = await sql`SELECT * FROM abandoned_carts WHERE id = ${Number(id)}`;
      if (!carts.length) return res.status(404).json({ error: 'Cart not found' });
      return res.status(200).json(carts[0]);
    }
    const status = params.get('status') || 'active';
    return res.status(200).json(await sql`SELECT * FROM abandoned_carts WHERE status = ${status} AND expires_at > NOW() ORDER BY created_at DESC`);
  }
  if (method === 'POST') {
    const b = await parseBody(req);
    if (!b.session_id || !b.cart_items?.length) return res.status(400).json({ error: 'session_id and cart_items required' });
    const existing = await sql`SELECT * FROM abandoned_carts WHERE session_id = ${b.session_id} AND status = 'active' AND expires_at > NOW()`;
    if (existing.length) {
      await sql`UPDATE abandoned_carts SET cart_items = ${JSON.stringify(b.cart_items)}, subtotal = ${b.subtotal||0}, customer_email = ${b.customer_email||null}, customer_name = ${b.customer_name||null}, customer_phone = ${b.customer_phone||null}, updated_at = NOW() WHERE session_id = ${b.session_id}`;
      return res.status(200).json({ updated: true, session_id: b.session_id });
    }
    const r = await sql`INSERT INTO abandoned_carts (session_id, customer_email, customer_name, customer_phone, cart_items, subtotal, status, created_at, updated_at, expires_at) VALUES (${b.session_id}, ${b.customer_email||null}, ${b.customer_name||null}, ${b.customer_phone||null}, ${JSON.stringify(b.cart_items)}, ${b.subtotal||0}, 'active', NOW(), NOW(), NOW() + INTERVAL '30 days') RETURNING *`;
    await triggerWebhook(sql, 'cart.abandoned', r[0]);
    return res.status(201).json(r[0]);
  }
  if (method === 'PUT') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'Cart ID required' });
    await sql`UPDATE abandoned_carts SET status = 'recovered', converted_to_order_id = ${b.order_id||null}, updated_at = NOW() WHERE id = ${b.id}`;
    return res.status(200).json({ success: true });
  }
  if (method === 'DELETE') {
    const b = await parseBody(req);
    if (!b.session_id) return res.status(400).json({ error: 'session_id required' });
    await sql`DELETE FROM abandoned_carts WHERE session_id = ${b.session_id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function sendRecoveryEmail(req, res, sql) {
  const b = await parseBody(req);
  if (!b.cart_id) return res.status(400).json({ error: 'cart_id required' });
  const cart = await sql`SELECT * FROM abandoned_carts WHERE id = ${b.cart_id}`;
  if (!cart.length) return res.status(404).json({ error: 'Cart not found' });
  if (!cart[0].customer_email) return res.status(400).json({ error: 'No customer email' });
  const templates = await sql`SELECT * FROM email_templates WHERE template_key = ${b.template_key||'abandoned_cart_1hr'} AND is_active = true`;
  if (!templates.length) return res.status(404).json({ error: 'Template not found' });
  console.log(`[Recovery Email] To: ${cart[0].customer_email}, Subject: ${templates[0].subject}`);
  await sql`UPDATE abandoned_carts SET recovery_email_sent = true, recovery_email_count = recovery_email_count + 1, last_reminder_sent = NOW(), updated_at = NOW() WHERE id = ${b.cart_id}`;
  return res.status(200).json({ success: true, message: 'Recovery email sent', email: cart[0].customer_email });
}

export async function handleCollections(req, res, sql, params) {
  const method = req.method;
  if (method === 'GET') {
    const slug = params.get('slug');
    if (slug) {
      const cols = await sql`SELECT * FROM collections WHERE slug = ${slug} AND is_active = true`;
      if (!cols.length) return res.status(404).json({ error: 'Collection not found' });
      const prods = await sql`SELECT p.*, cp.display_order FROM products p INNER JOIN collection_products cp ON p.id = cp.product_id WHERE cp.collection_id = ${cols[0].id} ORDER BY cp.display_order`;
      return res.status(200).json({ ...cols[0], products: prods });
    }
    return res.status(200).json(await sql`SELECT * FROM collections WHERE is_active = true ORDER BY display_order, name`);
  }
  if (method === 'POST') {
    const b = await parseBody(req);
    if (!b.name || !b.slug) return res.status(400).json({ error: 'name and slug required' });
    const r = await sql`INSERT INTO collections (name, slug, description, image_url, is_featured, display_order, is_active, created_at, updated_at) VALUES (${b.name}, ${b.slug}, ${b.description||''}, ${b.image_url||''}, ${b.is_featured||false}, ${b.display_order||0}, true, NOW(), NOW()) RETURNING *`;
    return res.status(201).json(r[0]);
  }
  if (method === 'PUT') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    const clauses = ['updated_at = NOW()'];
    if (b.name !== undefined) clauses.push(`name = '${b.name}'`);
    if (b.slug !== undefined) clauses.push(`slug = '${b.slug}'`);
    if (b.description !== undefined) clauses.push(`description = '${b.description}'`);
    if (b.image_url !== undefined) clauses.push(`image_url = '${b.image_url}'`);
    if (b.is_featured !== undefined) clauses.push(`is_featured = ${b.is_featured}`);
    if (b.display_order !== undefined) clauses.push(`display_order = ${b.display_order}`);
    if (b.is_active !== undefined) clauses.push(`is_active = ${b.is_active}`);
    const r = await sql`UPDATE collections SET ${sql.join(clauses.map(c=>sql.raw(c)), sql`, `)} WHERE id = ${b.id} RETURNING *`;
    if (!r.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(r[0]);
  }
  if (method === 'DELETE') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    await sql`UPDATE collections SET is_active = false, updated_at = NOW() WHERE id = ${b.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function handleCollectionProducts(req, res, sql) {
  const b = await parseBody(req);
  if (!b.collection_id || !b.product_ids?.length) return res.status(400).json({ error: 'collection_id and product_ids required' });
  if (b.action === 'remove') {
    await sql`DELETE FROM collection_products WHERE collection_id = ${b.collection_id} AND product_id = ANY(${b.product_ids})`;
  } else {
    for (const pid of b.product_ids) await sql`INSERT INTO collection_products (collection_id, product_id, display_order, added_at) VALUES (${b.collection_id}, ${pid}, 0, NOW()) ON CONFLICT (collection_id, product_id) DO NOTHING`;
  }
  return res.status(200).json({ success: true });
}

export async function handleLayoutSections(req, res, sql, params) {
  const method = req.method;
  if (method === 'GET') {
    const page = params.get('page') || 'homepage';
    return res.status(200).json(await sql`SELECT * FROM layout_sections WHERE is_active = true AND page_location = ${page} ORDER BY display_order`);
  }
  if (method === 'POST') {
    const b = await parseBody(req);
    if (!b.section_type || !b.config) return res.status(400).json({ error: 'section_type and config required' });
    const r = await sql`INSERT INTO layout_sections (section_type, section_name, config, display_order, page_location, is_active, created_at, updated_at) VALUES (${b.section_type}, ${b.section_name||''}, ${JSON.stringify(b.config)}, ${b.display_order||0}, ${b.page_location||'homepage'}, true, NOW(), NOW()) RETURNING *`;
    return res.status(201).json(r[0]);
  }
  if (method === 'PUT') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    const clauses = ['updated_at = NOW()'];
    if (b.section_name !== undefined) clauses.push(`section_name = '${b.section_name}'`);
    if (b.config !== undefined) clauses.push(`config = '${JSON.stringify(b.config).replace(/'/g,"''")}'`);
    if (b.display_order !== undefined) clauses.push(`display_order = ${b.display_order}`);
    if (b.page_location !== undefined) clauses.push(`page_location = '${b.page_location}'`);
    if (b.is_active !== undefined) clauses.push(`is_active = ${b.is_active}`);
    const r = await sql`UPDATE layout_sections SET ${sql.join(clauses.map(c=>sql.raw(c)), sql`, `)} WHERE id = ${b.id} RETURNING *`;
    if (!r.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(r[0]);
  }
  if (method === 'DELETE') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    await sql`DELETE FROM layout_sections WHERE id = ${b.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function reorderLayoutSections(req, res, sql) {
  const b = await parseBody(req);
  if (!Array.isArray(b.sections)) return res.status(400).json({ error: 'sections array required' });
  for (const s of b.sections) await sql`UPDATE layout_sections SET display_order = ${s.display_order}, updated_at = NOW() WHERE id = ${s.id}`;
  return res.status(200).json({ success: true });
}

// Bulk save endpoint for visual editor
export async function bulkSaveLayoutSections(req, res, sql) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const b = await parseBody(req);
  if (!b.sections || !Array.isArray(b.sections)) return res.status(400).json({ error: 'sections array required' });
  
  const page = b.page || 'homepage';
  
  try {
    // Delete existing sections for this page
    await sql`DELETE FROM layout_sections WHERE page_location = ${page}`;
    
    // Insert new sections
    for (const section of b.sections) {
      await sql`INSERT INTO layout_sections (section_type, section_name, config, display_order, page_location, is_active, created_at, updated_at) 
                VALUES (${section.type || section.section_type}, ${section.section_name||''}, ${JSON.stringify(section.settings || section.config)}, ${section.order || section.display_order||0}, ${page}, true, NOW(), NOW())`;
    }
    
    return res.status(200).json({ success: true, message: 'Layout saved successfully' });
  } catch (error) {
    console.error('Error saving layout:', error);
    return res.status(500).json({ error: 'Failed to save layout' });
  }
}

export async function handleWebhooks(req, res, sql, params) {
  const method = req.method;
  if (method === 'GET') return res.status(200).json(await sql`SELECT * FROM webhooks ORDER BY created_at DESC`);
  if (method === 'POST') {
    const b = await parseBody(req);
    if (!b.name || !b.url || !b.events?.length) return res.status(400).json({ error: 'name, url, and events required' });
    const r = await sql`INSERT INTO webhooks (name, url, events, secret_key, is_active, created_at, updated_at) VALUES (${b.name}, ${b.url}, ${b.events}, ${b.secret_key||null}, true, NOW(), NOW()) RETURNING *`;
    return res.status(201).json(r[0]);
  }
  if (method === 'PUT') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    const clauses = ['updated_at = NOW()'];
    if (b.name !== undefined) clauses.push(`name = '${b.name}'`);
    if (b.url !== undefined) clauses.push(`url = '${b.url}'`);
    if (b.events !== undefined) clauses.push(`events = '${JSON.stringify(b.events)}'`);
    if (b.secret_key !== undefined) clauses.push(`secret_key = '${b.secret_key}'`);
    if (b.is_active !== undefined) clauses.push(`is_active = ${b.is_active}`);
    const r = await sql`UPDATE webhooks SET ${sql.join(clauses.map(c=>sql.raw(c)), sql`, `)} WHERE id = ${b.id} RETURNING *`;
    if (!r.length) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(r[0]);
  }
  if (method === 'DELETE') {
    const b = await parseBody(req);
    if (!b.id) return res.status(400).json({ error: 'ID required' });
    await sql`UPDATE webhooks SET is_active = false, updated_at = NOW() WHERE id = ${b.id}`;
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function triggerWebhook(sql, eventType, payload) {
  try {
    const webhooks = await sql`SELECT * FROM webhooks WHERE is_active = true`;
    for (const wh of webhooks) {
      const events = Array.isArray(wh.events) ? wh.events : JSON.parse(wh.events || '[]');
      if (!events.includes(eventType)) continue;
      try {
        const sig = wh.secret_key ? crypto.createHmac('sha256', wh.secret_key).update(JSON.stringify(payload)).digest('hex') : '';
        const resp = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig }, body: JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload }) });
        const body = await resp.text();
        await sql`INSERT INTO webhook_logs (webhook_id, event_type, payload, response_status, response_body, success, created_at) VALUES (${wh.id}, ${eventType}, ${JSON.stringify(payload)}, ${resp.status}, ${body}, ${resp.ok}, NOW())`;
        await sql`UPDATE webhooks SET last_triggered = NOW(), ${resp.ok ? sql`success_count = success_count + 1` : sql`failure_count = failure_count + 1`} WHERE id = ${wh.id}`;
      } catch (e) { console.error('[Webhook Error]', wh.name, e.message); }
    }
  } catch (e) { console.error('[triggerWebhook]', e.message); }
}

export async function handleCSVImport(req, res, sql) {
  const b = await parseBody(req);
  if (!b.csv_data) return res.status(400).json({ error: 'csv_data required' });
  const lines = b.csv_data.trim().split('\\n'), headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
  const results = { imported: 0, updated: 0, errors: [] };
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) { results.errors.push({ line: i+1, error: 'Column mismatch' }); continue; }
    const p = {}; headers.forEach((h,idx) => { p[h] = values[idx]?.replace(/\"/g,'')||''; });
    try {
      if (!p.title || !p.price || !p.category) { results.errors.push({ line: i+1, error: 'Missing title/price/category' }); continue; }
      const existing = p.sku ? await sql`SELECT * FROM products WHERE sku = ${p.sku}` : await sql`SELECT * FROM products WHERE title = ${p.title}`;
      if (existing.length && b.update_existing) {
        await sql`UPDATE products SET title=${p.title}, description=${p.description||''}, price=${parseFloat(p.price)}, category=${p.category}, image_1=${p.image_1||''}, image_2=${p.image_2||''}, sizes=${p.sizes?JSON.stringify(p.sizes.split('|')):'[]'}, discount_price=${p.discount_price?parseFloat(p.discount_price):null}, stock=${p.stock?parseInt(p.stock):0}, updated_at=NOW() WHERE id=${existing[0].id}`;
        results.updated++;
      } else if (!existing.length) {
        await sql`INSERT INTO products (title, description, price, category, image_1, image_2, sizes, discount_price, stock, created_at, updated_at) VALUES (${p.title}, ${p.description||''}, ${parseFloat(p.price)}, ${p.category}, ${p.image_1||''}, ${p.image_2||''}, ${p.sizes?JSON.stringify(p.sizes.split('|')):'[]'}, ${p.discount_price?parseFloat(p.discount_price):null}, ${p.stock?parseInt(p.stock):0}, NOW(), NOW())`;
        results.imported++;
      }
    } catch (e) { results.errors.push({ line: i+1, error: e.message }); }
  }
  return res.status(200).json(results);
}

function parseCSVLine(line) {
  const result = []; let current = '', inQuotes = false;
  for (const c of line) {
    if (c === '\"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += c;
  }
  result.push(current);
  return result;
}
