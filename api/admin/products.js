import { neon } from '@neondatabase/serverless';

export default async function handler(req) {
  const sql = neon(process.env.DATABASE_URL);
  const method = req.method;
  
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

  try {
    // 🔹 GET: Fetch all products (public)
    if (method === 'GET') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      // Ensure JSONB arrays are parsed correctly for frontend
      const formatted = products.map(p => ({
        ...p,
        sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []),
        keywords: typeof p.keywords === 'string' ? JSON.parse(p.keywords) : (p.keywords || [])
      }));
      return new Response(JSON.stringify(formatted), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 🔹 POST: Create product (admin)
    if (method === 'POST') {
      const body = await req.json();
      if (!body.title || !body.price || !body.category) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
      }

      const sizes = typeof body.sizes === 'string' ? JSON.parse(body.sizes) : (body.sizes || []);
      const keywords = Array.isArray(body.keywords) ? body.keywords : (body.keywords || '').split(',').map(k => k.trim()).filter(Boolean);

      const result = await sql`
        INSERT INTO products (title, description, price, discount_price, category, image_1, image_2, image_3, sizes, keywords, created_at, updated_at)
        VALUES (${body.title}, ${body.description || ''}, ${body.price}, ${body.discount_price || null}, ${body.category}, ${body.image_1 || ''}, ${body.image_2 || ''}, ${body.image_3 || ''}, ${JSON.stringify(sizes)}, ${JSON.stringify(keywords)}, NOW(), NOW())
        RETURNING *
      `;
      return new Response(JSON.stringify(result[0]), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 🔹 PUT: Update product (admin)
    if (method === 'PUT') {
      const body = await req.json();
      if (!body.id) return new Response(JSON.stringify({ error: 'Product ID required' }), { status: 400, headers: cors });

      const sizes = typeof body.sizes === 'string' ? JSON.parse(body.sizes) : (body.sizes || []);
      const keywords = Array.isArray(body.keywords) ? body.keywords : (body.keywords || '').split(',').map(k => k.trim()).filter(Boolean);

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
      if (result.length === 0) return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: cors });
      return new Response(JSON.stringify(result[0]), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // 🔹 DELETE: Remove product (admin)
    if (method === 'DELETE') {
      const { id } = await req.json();
      if (!id) return new Response(JSON.stringify({ error: 'Product ID required' }), { status: 400, headers: cors });

      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (result.length === 0) return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404, headers: cors });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  } catch (error) {
    console.error('Products API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: cors });
  }
}