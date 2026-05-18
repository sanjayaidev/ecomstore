import jwt from 'jsonwebtoken';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { email, password } = await req.json();
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
        status: 500, headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { 
        status: 401, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    return new Response(JSON.stringify({ 
      success: true, 
      token, 
      user: { email, role: 'admin' } 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}