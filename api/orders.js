// api/orders.js — Minimal working version
import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not set' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET: Return empty array for now (safe fallback)
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }

    // POST: Accept order, return mock success (no DB write yet)
    if (req.method === 'POST') {
      const body = await req.json();
      return res.status(201).json({
        success: true,
        message: 'Order received (demo mode)',
        orderId: 'demo-' + Date.now(),
        data: body
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Orders API error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
