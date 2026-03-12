// src/middlewares/authMiddleware.js
const ApiError = require("../utils/ApiError");
const env = require("../config/env");

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== env.adminApiKey) {
    return next(
      new ApiError(401, "Unauthorized — invalid or missing x-api-key header")
    );
  }

  next();
};

module.exports = authMiddleware;
