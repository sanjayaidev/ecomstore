// api/orders.js — Vercel Serverless (Node.js runtime)
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Check env var
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const body = req.method !== 'GET' ? await req.json() : {};

    // 🔹 GET: Fetch all orders (admin)
    if (req.method === 'GET') {
      const orders = await sql`
        SELECT o.*, 
          (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
           FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = o.id) as items_detail
        FROM orders o ORDER BY o.created_at DESC
      `;
      return res.status(200).json(orders);
    }

    // 🔹 POST: Create new order (checkout)
    if (req.method === 'POST') {
      const { customer_name, customer_email, customer_phone, customer_address, items, total, payment_method, notes } = body;
      
      if (!customer_email || !items?.length || !total) {
        return res.status(400).json({ error: 'Missing required fields: customer_email, items, total' });
      }

      // Start transaction-like flow (Neon supports batch)
      const orderResult = await sql`
        INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total, payment_method, notes, status, created_at, updated_at)
        VALUES (${customer_name || null}, ${customer_email}, ${customer_phone || null}, ${customer_address || null}, ${total}, ${payment_method || 'cod'}, ${notes || null}, 'pending', NOW(), NOW())
        RETURNING id
      `;
      const orderId = orderResult[0].id;

      // Insert order items
      for (const item of items) {
        await sql`
          INSERT INTO order_items (order_id, product_id, size, quantity, price)
          VALUES (${orderId}, ${item.product_id}, ${item.size || null}, ${item.quantity}, ${item.price})
        `;
        // Optional: decrement product stock here if needed
      }

      // Fetch full order with items for response
      const fullOrder = await sql`
        SELECT o.*, 
          (SELECT json_agg(json_build_object('product_id', oi.product_id, 'title', p.title, 'price', oi.price, 'quantity', oi.quantity, 'size', oi.size))
           FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = o.id) as items_detail
        FROM orders o WHERE o.id = ${orderId}
      `;

      return res.status(201).json(fullOrder[0]);
    }

    // 🔹 PUT: Update order status
    if (req.method === 'PUT') {
      const { id, status, tracking_number, notes } = body;
      if (!id) return res.status(400).json({ error: 'Order ID required' });

      const updates = [];
      const values = [];
      
      if (status) { updates.push(sql`status = ${status}`); }
      if (tracking_number) { updates.push(sql`tracking_number = ${tracking_number}`); }
      if (notes) { updates.push(sql`notes = ${notes}`); }
      updates.push(sql`updated_at = NOW()`);

      const result = await sql`
        UPDATE orders SET ${sql.join(updates, sql`, `)} WHERE id = ${id} RETURNING *
      `;
      
      if (result.length === 0) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json(result[0]);
    }

    // 🔹 DELETE: Cancel order
    if (req.method === 'DELETE') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Order ID required' });

      // Soft delete: mark as cancelled
      const result = await sql`
        UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${id} RETURNING id
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error) {
    console.error('💥 Orders API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}