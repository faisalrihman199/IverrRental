require('dotenv').config();
const jwt = require('jsonwebtoken');

function makeVisitor(req, res, next) {
    const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];

    if (!token) {
        // If no token is provided, assign a default 'visitor' role
        req.user = { role: 'visitor' };
        return next();
    }

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

module.exports = makeVisitor;
