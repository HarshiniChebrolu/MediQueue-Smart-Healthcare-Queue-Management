import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[FATAL SECURITY ERROR] JWT_SECRET is not defined in environment variables!');
    return res.status(500).json({ message: 'Server authentication configuration error.' });
  }

  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, secret);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User account not found or session revoked.' });
      }

      if (!req.user.activeStatus) {
        return res.status(403).json({ message: 'Account has been deactivated. Please contact hospital administration.' });
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please sign in again.' });
      }
      return res.status(401).json({ message: 'Not authorized, invalid token.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, authentication token missing.' });
  }
};
