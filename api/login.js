export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const { email, password } = await req.json();
  if (email === 'sanjay@mystore.com' && password === 'sanjay@123') {
    return new Response(JSON.stringify({ success: true, token: 'test-' + Date.now(), user: { email } }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });
  }
  return new Response(JSON.stringify({ error: 'Invalid' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}
