import jwt from 'jsonwebtoken';

// Decodes the `Authorization: Bearer <token>` header on a Node-style
// (Vercel serverless) request, where `req.headers` is a plain object with
// lowercase keys — NOT the Web Fetch API `Headers` object.
// Returns the decoded JWT payload (any role) if valid, or null.
export function verifyToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Returns the decoded JWT payload only if it belongs to an admin, or null.
export function verifyAdmin(req) {
  const decoded = verifyToken(req);
  return decoded?.role === 'admin' ? decoded : null;
}

// Sends a 401 response using the same Node-style `res` object (res.status().json())
// used throughout api/index.js.
export function unauthorizedResponse(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Sends a 403 response for an authenticated-but-not-allowed request.
export function forbiddenResponse(res) {
  return res.status(403).json({ error: 'Forbidden' });
}