const db = require('../db');

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.redirect('/dashboard');
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

function loginRoute(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const admin = db.getDb().prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const bcrypt = require('bcrypt');
  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.admin = { id: admin.id, username: admin.username };
  return res.json({ success: true });
}

function logoutRoute(req, res) {
  req.session = null;
  return res.json({ success: true });
}

module.exports = { requireAuth, loginRoute, logoutRoute };
