// api/cms/sliders.js — /api/cms/sliders
// GET (all), POST (create), PUT (update), DELETE (remove)
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.DATABASE_URL) return res.status(500).json({ success: false, error: 'DATABASE_URL not configured' });

  const sql = neon(process.env.DATABASE_URL);

  // Extract trailing :id from URL  e.g. /api/cms/sliders/5
  const url = req.url || '';
  const idMatch = url.match(/\/(\d+)(?:\?.*)?$/);
  const urlId = idMatch ? parseInt(idMatch[1]) : null;

  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM cms_hero_sliders ORDER BY display_order ASC`;
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.title) return res.status(400).json({ success: false, error: 'Title is required' });
      const row = await sql`
        INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active)
        VALUES (${b.title}, ${b.subtitle||null}, ${b.image_url||null}, ${b.cta_text||null}, ${b.cta_link||null},
                ${b.background_color||'#f8f9fa'}, ${b.text_color||'#000000'}, ${b.display_order||0}, ${b.is_active !== false})
        RETURNING *`;
      return res.status(201).json({ success: true, data: row[0] });
    }

    if (req.method === 'PUT') {
      const id = urlId || req.body?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      const b = req.body || {};
      const row = await sql`
        UPDATE cms_hero_sliders SET
          title            = COALESCE(${b.title}, title),
          subtitle         = COALESCE(${b.subtitle}, subtitle),
          image_url        = COALESCE(${b.image_url}, image_url),
          cta_text         = COALESCE(${b.cta_text}, cta_text),
          cta_link         = COALESCE(${b.cta_link}, cta_link),
          background_color = COALESCE(${b.background_color}, background_color),
          text_color       = COALESCE(${b.text_color}, text_color),
          display_order    = COALESCE(${b.display_order}, display_order),
          is_active        = COALESCE(${b.is_active}, is_active),
          updated_at       = NOW()
        WHERE id = ${id} RETURNING *`;
      if (!row.length) return res.status(404).json({ success: false, error: 'Not found' });
      return res.status(200).json({ success: true, data: row[0] });
    }

    if (req.method === 'DELETE') {
      const id = urlId || req.body?.id;
      if (!id) return res.status(400).json({ success: false, error: 'ID required' });
      await sql`DELETE FROM cms_hero_sliders WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Slider deleted' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Sliders API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}