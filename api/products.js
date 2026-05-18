// api/products.js - Vercel Serverless + Neon
import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge', // Faster cold starts on Vercel
};

export default async function handler(req) {
  const url = new URL(req.url);
  const method = req.method;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 🔹 GET /api/products
    if (method === 'GET') {
      const params = url.searchParams;
      let query = sql`SELECT * FROM products WHERE 1=1`;
      const conditions = [];
      const values = [];

      // Filter by IDs
      if (params.get('ids')) {
        const ids = params.get('ids').split(',').map(id => id.trim());
        conditions.push(sql`id = ANY(${ids})`);
      }
      
      // Filter by category
      if (params.get('category')) {
        conditions.push(sql`category = ${params.get('category')}`);
      }
      
      // Search by keywords (simple LIKE for now)
      if (params.get('keywords')) {
        const kw = `%${params.get('keywords')}%`;
        conditions.push(sql`(title ILIKE ${kw} OR description ILIKE ${kw})`);
      }

      if (conditions.length > 0) {
        query = sql`SELECT * FROM products WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      // Sorting
      const sort = params.get('sort');
      if (sort === 'newest') {
        query = sql`${query} ORDER BY created_at DESC`;
      } else if (sort === 'price_low') {
        query = sql`${query} ORDER BY price ASC`;
      } else if (sort === 'price_high') {
        query = sql`${query} ORDER BY price DESC`;
      }

      // Limit
      const limit = parseInt(params.get('limit')) || 20;
      query = sql`${query} LIMIT ${limit}`;

      const products = await query;
      
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 🔹 POST /api/products (Admin only - add auth later)
    if (method === 'POST') {
      const body = await req.json();
      const { title, description, price, category, image_1, image_2, sizes, discount_price } = body;

      if (!title || !price || !category) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const result = await sql`
        INSERT INTO products (
          title, description, price, category, image_1, image_2, 
          sizes, discount_price, created_at, updated_at
        ) VALUES (
          ${title}, ${description || ''}, ${price}, ${category}, 
          ${image_1 || ''}, ${image_2 || ''}, ${JSON.stringify(sizes || [])},
          ${discount_price || null}, NOW(), NOW()
        ) RETURNING *
      `;

      return new Response(JSON.stringify(result[0]), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Products API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
