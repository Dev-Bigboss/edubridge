import { useState } from "react";
import { Mail, Lock, BookOpen, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempt:", formData);
    // TODO: Send to backend
  };

  const hanldeSignIn = () => {
    router. push("/dashboard")
  }

  const handleGoogleLogin = () => {
    console.log("Google login clicked");
    // TODO: Google OAuth
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
    // TODO: Navigate to forgot password page
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 0",
      }}
    >
      <div className="container" style={{ maxWidth: "450px" }}>
        {/* Header */}
        <div className="text-center mb-5">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)",
              color: "white",
            }}
          >
            <BookOpen size={32} />
          </div>
          <h1 className="fw-bold text-dark mb-2">Welcome Back</h1>
          <p className="text-muted">Sign in to your EduBridge account</p>
        </div>

        {/* Login Card */}
        <div
          className="card"
          style={{
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            borderRadius: "16px",
          }}
        >
          <div className="card-body border-bottom">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn-outline-secondary w-100 py-3 d-flex align-items-center justify-content-center"
              style={{ borderRadius: "8px" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" className="me-3">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="d-flex align-items-center my-4">
              <hr className="flex-grow-1" />
              <span className="px-3 text-muted small">or</span>
              <hr className="flex-grow-1" />
            </div>
          </div>

          {/* Login Form */}
          <form className="card-body" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label fw-medium">
                Email Address
              </label>
              <div className="position-relative">
                <Mail
                  size={20}
                  className="position-absolute text-muted"
                  style={{ left: "12px", top: "12px" }}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-control py-3"
                  style={{ paddingLeft: "40px", borderRadius: "8px" }}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label fw-medium">
                Password
              </label>
              <div className="position-relative">
                <Lock
                  size={20}
                  className="position-absolute text-muted"
                  style={{ left: "12px", top: "12px" }}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control py-3"
                  style={{
                    paddingLeft: "40px",
                    paddingRight: "40px",
                    borderRadius: "8px",
                  }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="border-0 position-absolute text-muted p-0"
                  style={{ right: "12px", top: "8px" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="form-check-input"
                  id="rememberMe"
                />
                <label
                  className="form-check-label text-muted"
                  htmlFor="rememberMe"
                >
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="border-0 text-primary p-0 fw-medium text-decoration-none"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-3 fw-semibold"
              style={{
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)",
                border: "none",
                boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)",
              }}
              onClick={hanldeSignIn}
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-muted mb-2">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-primary fw-medium text-decoration-none"
            >
              Sign up
            </a>
          </p>
          <div className="d-flex justify-content-center gap-3 small text-muted">
            <a href="/signup?type=student" className="text-decoration-none">
              Join as Student
            </a>
            <span>•</span>
            <a href="/signup?type=tutor" className="text-decoration-none">
              Become a Tutor
            </a>
          </div>
        </div>

        {/* Demo Credentials */}
        <div
          className="mt-4 p-3 rounded-3"
          style={{ backgroundColor: "#e3f2fd" }}
        >
          <h6 className="fw-semibold text-primary mb-2">Demo Credentials</h6>
          <div className="small text-primary">
            <p className="mb-1">
              <strong>Student:</strong> student@edubridge.com / password123
            </p>
            <p className="mb-0">
              <strong>Tutor:</strong> tutor@edubridge.com / password123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
