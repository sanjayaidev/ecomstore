// api/cms/sections.js — /api/cms/sections
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.DATABASE_URL) return res.status(500).json({ success: false, error: 'DATABASE_URL not configured' });

  const sql = neon(process.env.DATABASE_URL);
  const url = req.url || '';
  const idMatch = url.match(/\/(\d+)(?:\?.*)?$/);
  const urlId = idMatch ? parseInt(idMatch[1]) : null;

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_product_sections ORDER BY display_order ASC`;
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'PUT') {
      const id = urlId || req.body?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      const b = req.body || {};
      const row = await sql`
        UPDATE cms_product_sections SET
          title        = COALESCE(${b.title}, title),
          subtitle     = COALESCE(${b.subtitle}, subtitle),
          section_type = COALESCE(${b.section_type}, section_type),
          display_order= COALESCE(${b.display_order}, display_order),
          is_active    = COALESCE(${b.is_active}, is_active),
          updated_at   = NOW()
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: row[0] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Sections API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}