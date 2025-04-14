const jwt = require('jsonwebtoken');

const verifyToken = (token) => {

  try {
    const verified = jwt.verify(token, process.env.JWT_KEY);
    return verified;
} catch (err) {
    return null;
  }
};

module.exports = { verifyToken };
