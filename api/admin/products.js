import { neon } from '@neondatabase/serverless';
import { verifyAdmin, unauthorizedResponse } from '../../lib/auth.js';

export default async function handler(req) {
  const admin = verifyAdmin(req);
  if (!admin) return unauthorizedResponse();

  const sql = neon(process.env.DATABASE_URL);
  const url = new URL(req.url);
  const method = req.method;

  try {
    // 🔹 GET all products (admin view)
    if (method === 'GET') {
      const products = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      return new Response(JSON.stringify(products), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 🔹 POST create product
    if (method === 'POST') {
      const body = await req.json();
      const { title, description, price, discount_price, category, image_1, image_2, sizes, keywords } = body;

      if (!title || !price || !category) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
          status: 400, headers: { 'Content-Type': 'application/json' } 
        });
      }

      const result = await sql`
        INSERT INTO products (title, description, price, discount_price, category, image_1, image_2, sizes, keywords, created_at, updated_at)
        VALUES (${title}, ${description || ''}, ${price}, ${discount_price || null}, ${category}, ${image_1 || ''}, ${image_2 || ''}, ${JSON.stringify(sizes || [])}, ${JSON.stringify(keywords || [])}, NOW(), NOW())
        RETURNING *
      `;

      return new Response(JSON.stringify(result[0]), { 
        status: 201, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 🔹 PUT update product
    if (method === 'PUT') {
      const body = await req.json();
      const { id, title, description, price, discount_price, category, image_1, image_2, sizes, keywords } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Product ID required' }), { 
          status: 400, headers: { 'Content-Type': 'application/json' } 
        });
      }

      const result = await sql`
        UPDATE products 
        SET title = COALESCE(${title}, title),
            description = COALESCE(${description}, description),
            price = COALESCE(${price}, price),
            discount_price = COALESCE(${discount_price}, discount_price),
            category = COALESCE(${category}, category),
            image_1 = COALESCE(${image_1}, image_1),
            image_2 = COALESCE(${image_2}, image_2),
            sizes = COALESCE(${JSON.stringify(sizes)}, sizes),
            keywords = COALESCE(${JSON.stringify(keywords)}, keywords),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { 
          status: 404, headers: { 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify(result[0]), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 🔹 DELETE product
    if (method === 'DELETE') {
      const { id } = await req.json();
      if (!id) {
        return new Response(JSON.stringify({ error: 'Product ID required' }), { 
          status: 400, headers: { 'Content-Type': 'application/json' } 
        });
      }

      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { 
          status: 404, headers: { 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ success: true, deletedId: id }), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Admin Products API Error:', error);
    return new Response(JSON.stringify({ error: 'Database operation failed' }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}