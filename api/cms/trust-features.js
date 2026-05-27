// api/cms/trust-features.js — /api/cms/trust-features
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.DATABASE_URL) return res.status(500).json({ success: false, error: 'DATABASE_URL not configured' });

  const sql = neon(process.env.DATABASE_URL);
  const url = req.url || '';
  const idMatch = url.match(/\/(\d+)(?:\?.*)?$/);
  const urlId = idMatch ? parseInt(idMatch[1]) : null;

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_trust_features ORDER BY display_order ASC`;
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.title) return res.status(400).json({ success: false, error: 'Title required' });
      const row = await sql`
        INSERT INTO cms_trust_features (icon_emoji, title, description, display_order, is_active)
        VALUES (${b.icon_emoji||'✓'}, ${b.title}, ${b.description||null}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return res.status(201).json({ success: true, data: row[0] });
    }

    if (req.method === 'PUT') {
      const id = urlId || req.body?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      const b = req.body || {};
      const row = await sql`
        UPDATE cms_trust_features SET
          icon_emoji    = COALESCE(${b.icon_emoji}, icon_emoji),
          title         = COALESCE(${b.title}, title),
          description   = COALESCE(${b.description}, description),
          display_order = COALESCE(${b.display_order}, display_order),
          is_active     = COALESCE(${b.is_active}, is_active)
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: row[0] });
    }

    if (req.method === 'DELETE') {
      const id = urlId || req.body?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      await sql`DELETE FROM cms_trust_features WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Feature deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Trust features API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}