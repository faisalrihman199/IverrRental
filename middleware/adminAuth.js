require('dotenv').config();
const jwt = require('jsonwebtoken');

function adminAuth(req, res, next) {
    const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_KEY); // Replace with env variable in production
        req.user = verified;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied. Admins only.' });
        }

        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
}

module.exports = adminAuth;
