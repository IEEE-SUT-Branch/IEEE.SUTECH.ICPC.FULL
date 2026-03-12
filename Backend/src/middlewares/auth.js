const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "No token provided");
  }

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, env.jwt.accessSecret);
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "Insufficient permissions");
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
