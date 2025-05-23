require('dotenv').config();
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_KEY);
        req.user = verified;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send('Token Expired');
        }
        res.status(400).send('Invalid Token');
    }
}

module.exports = authenticateToken;
