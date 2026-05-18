export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const { email, password } = body ? JSON.parse(body) : {};
      
      if (email === 'sanjay@mystore.com' && password === 'sanjay@123') {
        return res.status(200).json({ 
          success: true, 
          token: 'test-' + Date.now(), 
          user: { email, role: 'admin' } 
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
