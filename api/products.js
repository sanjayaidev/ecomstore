import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS for local dev & Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 🔹 GET /api/products?category=Saree
    if (req.method === 'GET') {
      const { category } = req.query;
      let query = sql`SELECT * FROM products`;

      if (category) {
        query = sql`SELECT * FROM products WHERE category = ${category}`;
      }

      const products = await query;
      return res.status(200).json(products);
    }

    // 🔹 POST /api/products (Admin)
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, description, price, category, image_1, image_2, sizes } = body;

      if (!title || !price || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const newProduct = await sql`
        INSERT INTO products (title, description, price, category, image_1, image_2, sizes)
        VALUES (${title}, ${description || ''}, ${price}, ${category}, ${image_1 || ''}, ${image_2 || ''}, ${JSON.stringify(sizes || [])})
        RETURNING *
      `;

      return res.status(201).json(newProduct[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Products API Error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}