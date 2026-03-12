import React, { useState } from "react";
import { useNavigate } from "react-router";
import { adminLogin, studentLogin } from "../api";
import sutLogo from "../assets/SUT-logo.PNG";
import ieeeLogo from "../assets/ieee-logo.png";

const PRIMARY = "#006199";
const BG = "#f5f7f8";

function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("student");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [email, setEmail] = useState("");
  const [id, setId] = useState("");
  const [showId, setShowId] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setErrors({});
    setEmail("");
    setId("");
    setUsername("");
    setPassword("");
    setShowId(false);
    setShowPassword(false);
  };

  const validate = () => {
    const errors = {};
    if (tab === "student") {
      if (!email.trim()) {
        errors.email = "Email is Required.";
      } else if (!email.endsWith("@sut.edu.eg")) {
        errors.email = "Must use university email";
      }
      if (!id.trim()) {
        errors.id = "Password / ID is Required.";
      }
    } else {
      if (!username.trim()) errors.username = "Username is Required";
      if (!password.trim()) errors.password = "Password is Required";
    }
    return errors;
  };

  const handleLogin = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      setLoading(true);
      setErrors({});
      if (tab === "student") {
        await studentLogin(email, id);
        navigate("/lobby");
      } else {
        await adminLogin(username, password);
        navigate("/admin/dashboard");
      }
    } catch (error) {
      const message = error.response?.data?.message || "Login Failed";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px 10px 40px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#f8fafc",
    color: "#1e293b",
    fontFamily: "Space Grotesk, sans-serif",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "6px",
    marginTop: "16px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Space Grotesk, sans-serif",
        padding: "24px 16px",
      }}
    >
      {/* Brand Logos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0",
          marginBottom: "28px",
        }}
      >
        {/* SUTech Logo */}
        <div style={{ padding: "0 24px" }}>
          <img
            src={sutLogo}
            alt="Suez University of Technology"
            style={{
              height: "125px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Divider */}
        <div
          style={{ width: "1px", height: "100px", background: "#d1d5db" }}
        />

        {/* IEEE Logo */}
        <div style={{ padding: "0 24px" }}>
          <img
            src={ieeeLogo}
            alt="IEEE SUTech Student Branch"
            style={{
              height: "125px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          background: "#e8edf2",
          borderRadius: "40px",
          padding: "4px",
          marginBottom: "24px",
          width: "240px",
        }}
      >
        {["student", "admin"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabSwitch(t)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: "36px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700",
              fontFamily: "Space Grotesk, sans-serif",
              transition: "all 0.2s",
              background: tab === t ? PRIMARY : "transparent",
              color: tab === t ? "#fff" : "#64748b",
              boxShadow: tab === t ? "0 2px 8px rgba(0,97,153,0.25)" : "none",
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Login Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.09)",
          padding: "36px 40px 28px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: PRIMARY,
            textAlign: "center",
            marginBottom: "6px",
            letterSpacing: "-0.01em",
          }}
        >
          Competitive Programming
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "#94a3b8",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          {tab === "student"
            ? "Sign in to your student account to continue"
            : "Sign in to your admin account to continue"}
        </p>

        {/* General error */}
        {errors.general && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              marginBottom: "16px",
              fontWeight: "600",
            }}
          >
            {errors.general}
          </div>
        )}

        {tab === "student" ? (
          <>
            {/* Email Field */}
            <label style={labelStyle}>University Email</label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              >
                alternate_email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@sut.edu.eg"
                style={{
                  ...inputStyle,
                  borderColor: errors.email ? "#fca5a5" : "#e2e8f0",
                }}
              />
            </div>
            {errors.email && (
              <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                {errors.email}
              </p>
            )}

            {/* Password/ID Field */}
            <label style={labelStyle}>Password / Student ID</label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              >
                lock
              </span>
              <input
                type={showId ? "text" : "password"}
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Enter your password / ID"
                style={{
                  ...inputStyle,
                  paddingRight: "40px",
                  borderColor: errors.id ? "#fca5a5" : "#e2e8f0",
                }}
              />
              <button
                type="button"
                onClick={() => setShowId(!showId)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {showId ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.id && (
              <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                {errors.id}
              </p>
            )}

            {/* Remember me + Forgot */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "14px",
                marginBottom: "20px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  style={{ accentColor: PRIMARY, width: "15px", height: "15px" }}
                />
                Remember me
              </label>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: PRIMARY,
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                Forgot ID?
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Username Field */}
            <label style={labelStyle}>Username</label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              >
                person
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  ...inputStyle,
                  borderColor: errors.username ? "#fca5a5" : "#e2e8f0",
                }}
              />
            </div>
            {errors.username && (
              <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                {errors.username}
              </p>
            )}

            {/* Password Field */}
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              >
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  ...inputStyle,
                  paddingRight: "40px",
                  borderColor: errors.password ? "#fca5a5" : "#e2e8f0",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && (
              <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                {errors.password}
              </p>
            )}

            <div style={{ marginBottom: "20px" }} />
          </>
        )}

        {/* Login Button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#94a3b8" : PRIMARY,
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Space Grotesk, sans-serif",
            letterSpacing: "0.01em",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

      </div>

      {/* Footer Text */}
      <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "20px" }}>
        Don&apos;t have an account?{" "}
        <span style={{ color: PRIMARY, fontWeight: "600" }}>Contact Admin</span>
      </p>

      {/* Copyright Footer */}
      <footer
        style={{
          marginTop: "32px",
          textAlign: "center",
          color: "#cbd5e1",
          fontSize: "12px",
        }}
      >
        &copy; {new Date().getFullYear()} IEEE SUTECH &mdash; Competitive Programming Platform
      </footer>
    </div>
  );
}

export default Login;
