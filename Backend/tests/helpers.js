require("dotenv").config();
const axios = require("axios");

let baseURL = "";

function setBaseURL(url) {
  baseURL = url;
}

async function getAdminToken() {
  const res = await axios.post(`${baseURL}/api/auth/admin/login`, {
    username: "testadmin",
    password: "testpass123",
  });
  return res.data.data.accessToken;
}

async function getStudentToken(email, universityId) {
  const res = await axios.post(`${baseURL}/api/auth/student/login`, {
    email,
    universityId,
  });
  return res.data.data.accessToken;
}

function api(token) {
  return axios.create({
    baseURL: `${baseURL}/api`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });
}

function emailApi() {
  return axios.create({
    baseURL: `${baseURL}/api`,
    headers: {
      "x-api-key":
        process.env.ADMIN_API_KEY || "change_this_to_something_secret",
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });
}

module.exports = { setBaseURL, getAdminToken, getStudentToken, api, emailApi };
