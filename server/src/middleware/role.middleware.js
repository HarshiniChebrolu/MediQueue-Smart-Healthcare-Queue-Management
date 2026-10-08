export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access forbidden: Role '${req.user ? req.user.role : 'guest'}' is not authorized for this operation. Required: ${roles.join(', ')}`,
      });
    }
    next();
  };
};
