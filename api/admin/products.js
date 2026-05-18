// api/admin/products.js — Vercel Serverless (Node.js runtime)
import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 🔹 GET: Fetch all products
    if (req.method === 'GET') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      const formatted = products.map(p => ({
        ...p,
        sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []),
        keywords: typeof p.keywords === 'string' ? JSON.parse(p.keywords) : (p.keywords || [])
      }));
      return res.status(200).json(formatted);
    }

    // 🔹 POST: Create product
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.title || !body.price || !body.category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const sizes = Array.isArray(body.sizes) ? body.sizes : [];
      const keywords = Array.isArray(body.keywords) ? body.keywords : [];

      const result = await sql`
        INSERT INTO products (title, description, price, discount_price, category, image_1, image_2, image_3, sizes, keywords, created_at, updated_at)
        VALUES (${body.title}, ${body.description || ''}, ${body.price}, ${body.discount_price || null}, ${body.category}, ${body.image_1 || ''}, ${body.image_2 || ''}, ${body.image_3 || ''}, ${JSON.stringify(sizes)}, ${JSON.stringify(keywords)}, NOW(), NOW())
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    // 🔹 PUT: Update product
    if (req.method === 'PUT') {
      const body = req.body;
      if (!body.id) return res.status(400).json({ error: 'Product ID required' });
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
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json(result[0]);
    }

    // 🔹 DELETE: Remove product
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Product ID required' });
      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('Admin Products API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}