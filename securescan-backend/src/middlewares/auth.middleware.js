import jwtPkg from 'jsonwebtoken';
const jwt = jwtPkg;

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * authMiddleware
 * Verifies the JWT from the Authorization header.
 * Attaches req.userId on success.
 *
 * Usage: router.get('/protected', authMiddleware, handler)
 * Header: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export { authMiddleware };