const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../lib/auth');

// Get all homepage content
router.get('/content', async (req, res) => {
  try {
    const [sliders, categories, banners, sections, trustFeatures, newsletter] = await Promise.all([
      pool.query('SELECT * FROM cms_hero_sliders WHERE is_active = true ORDER BY display_order'),
      pool.query('SELECT * FROM cms_categories WHERE is_active = true ORDER BY display_order'),
      pool.query('SELECT * FROM cms_offer_banners WHERE is_active = true ORDER BY display_order'),
      pool.query('SELECT * FROM cms_product_sections WHERE is_active = true ORDER BY display_order'),
      pool.query('SELECT * FROM cms_trust_features WHERE is_active = true ORDER BY display_order'),
      pool.query('SELECT * FROM cms_newsletter_settings LIMIT 1')
    ]);

    res.json({
      success: true,
      data: {
        sliders: sliders.rows,
        categories: categories.rows,
        banners: banners.rows,
        sections: sections.rows,
        trustFeatures: trustFeatures.rows,
        newsletter: newsletter.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch content' });
  }
});

// Hero Sliders CRUD
router.get('/sliders', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_hero_sliders ORDER BY display_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sliders', requireAuth, async (req, res) => {
  try {
    const { title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order } = req.body;
    const result = await pool.query(
      `INSERT INTO cms_hero_sliders (title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/sliders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active } = req.body;
    const result = await pool.query(
      `UPDATE cms_hero_sliders SET 
        title = $1, subtitle = $2, image_url = $3, cta_text = $4, cta_link = $5,
        background_color = $6, text_color = $7, display_order = $8, is_active = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [title, subtitle, image_url, cta_text, cta_link, background_color, text_color, display_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/sliders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cms_hero_sliders WHERE id = $1', [id]);
    res.json({ success: true, message: 'Slider deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Categories CRUD
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_categories ORDER BY display_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/categories', requireAuth, async (req, res) => {
  try {
    const { name, slug, icon_emoji, image_url, description, display_order } = req.body;
    const result = await pool.query(
      `INSERT INTO cms_categories (name, slug, icon_emoji, image_url, description, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, slug, icon_emoji, image_url, description, display_order || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, icon_emoji, image_url, description, display_order, is_active } = req.body;
    const result = await pool.query(
      `UPDATE cms_categories SET 
        name = $1, slug = $2, icon_emoji = $3, image_url = $4, description = $5,
        display_order = $6, is_active = $7
       WHERE id = $8 RETURNING *`,
      [name, slug, icon_emoji, image_url, description, display_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cms_categories WHERE id = $1', [id]);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Offer Banners CRUD
router.get('/banners', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_offer_banners ORDER BY display_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/banners', requireAuth, async (req, res) => {
  try {
    const { title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order } = req.body;
    const result = await pool.query(
      `INSERT INTO cms_offer_banners (title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order || 0]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/banners/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order, is_active } = req.body;
    const result = await pool.query(
      `UPDATE cms_offer_banners SET 
        title = $1, subtitle = $2, offer_text = $3, image_url = $4, gradient_start = $5,
        gradient_end = $6, cta_text = $7, cta_link = $8, display_order = $9, is_active = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [title, subtitle, offer_text, image_url, gradient_start, gradient_end, cta_text, cta_link, display_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/banners/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cms_offer_banners WHERE id = $1', [id]);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Product Sections CRUD
router.get('/sections', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_product_sections ORDER BY display_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/sections/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, section_type, display_order, is_active, config } = req.body;
    const result = await pool.query(
      `UPDATE cms_product_sections SET 
        title = $1, subtitle = $2, section_type = $3, display_order = $4, is_active = $5, config = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, subtitle, section_type, display_order, is_active, JSON.stringify(config), id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trust Features CRUD
router.get('/trust-features', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_trust_features ORDER BY display_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/trust-features/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { icon_emoji, title, description, display_order, is_active } = req.body;
    const result = await pool.query(
      `UPDATE cms_trust_features SET 
        icon_emoji = $1, title = $2, description = $3, display_order = $4, is_active = $5
       WHERE id = $6 RETURNING *`,
      [icon_emoji, title, description, display_order, is_active, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Newsletter Settings
router.get('/newsletter', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_newsletter_settings LIMIT 1');
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/newsletter', requireAuth, async (req, res) => {
  try {
    const { title, subtitle, is_active } = req.body;
    let result;
    const existing = await pool.query('SELECT id FROM cms_newsletter_settings LIMIT 1');
    
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE cms_newsletter_settings SET title = $1, subtitle = $2, is_active = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [title, subtitle, is_active, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO cms_newsletter_settings (title, subtitle, is_active) VALUES ($1, $2, $3) RETURNING *`,
        [title, subtitle, is_active]
      );
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
