const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
  const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });
  return { accessToken, refreshToken };
}

exports.studentLogin = asyncHandler(async (req, res) => {
  const { email, universityId } = req.body;
  if (!email || !universityId) {
    throw new ApiError(400, "Email and universityId are required");
  }

  const student = await Student.findOne({
    email: email.toLowerCase().trim(),
  });
  if (!student) throw new ApiError(401, "Invalid credentials");

  if (student.universityId !== universityId.trim()) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (student.contestSession?.isDisqualified) {
    throw new ApiError(403, "You have been disqualified");
  }

  const payload = {
    id: student._id.toString(),
    role: "student",
    email: student.email,
    fullName: student.fullName,
    lab: student.labAssignment,
    group: student.testGroup,
  };

  const tokens = generateTokens(payload);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        labAssignment: student.labAssignment,
        testGroup: student.testGroup,
      },
      ...tokens,
    },
  });
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
  if (!admin) throw new ApiError(401, "Invalid credentials");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const payload = {
    id: admin._id.toString(),
    role: admin.role,
    username: admin.username,
    fullName: admin.fullName,
  };

  const tokens = generateTokens(payload);

  res.json({
    success: true,
    message: "Admin login successful",
    data: {
      admin: {
        _id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
      },
      ...tokens,
    },
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "Refresh token required");

  try {
    const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
    const { iat, exp, ...payload } = decoded;
    const tokens = generateTokens(payload);
    res.json({ success: true, data: tokens });
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});
