// api/cms/content.js — GET /api/cms/content
// Returns all homepage CMS data in one call
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ success: false, error: 'DATABASE_URL not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [sliders, categories, banners, sections, trustFeatures, newsletter] = await Promise.all([
      sql`SELECT * FROM cms_hero_sliders ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_categories ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_offer_banners ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_product_sections ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_trust_features ORDER BY display_order ASC`,
      sql`SELECT * FROM cms_newsletter_settings LIMIT 1`
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sliders,
        categories,
        banners,
        sections,
        trustFeatures,
        newsletter: newsletter[0] || null
      }
    });
  } catch (error) {
    console.error('CMS content error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}