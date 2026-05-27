// api/cms/newsletter.js — /api/cms/newsletter
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.DATABASE_URL) return res.status(500).json({ success: false, error: 'DATABASE_URL not configured' });

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_newsletter_settings LIMIT 1`;
      return res.status(200).json({ success: true, data: rows[0] || null });
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      const existing = await sql`SELECT id FROM cms_newsletter_settings LIMIT 1`;
      let row;
      if (existing.length) {
        row = await sql`
          UPDATE cms_newsletter_settings SET
            title      = COALESCE(${b.title}, title),
            subtitle   = COALESCE(${b.subtitle}, subtitle),
            is_active  = COALESCE(${b.is_active}, is_active),
            updated_at = NOW()
          WHERE id = ${existing[0].id} RETURNING *`;
      } else {
        row = await sql`
          INSERT INTO cms_newsletter_settings (title, subtitle, is_active)
          VALUES (${b.title || 'Subscribe'}, ${b.subtitle || ''}, ${b.is_active !== false})
          RETURNING *`;
      }
      return res.status(200).json({ success: true, data: row[0] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Newsletter API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}