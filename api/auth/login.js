export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { email, password } = await req.json();
    
    // Hardcoded for testing - replace with env vars after confirmation
    if (email === 'sanjay@mystore.com' && password === 'sanjay@123') {
      return new Response(JSON.stringify({ 
        success: true, 
        token: 'debug-token-' + Date.now(), 
        user: { email, role: 'admin' } 
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
