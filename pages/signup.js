import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  MapPin,
  BookOpen,
  DollarSign,
  Calendar,
  Star,
} from "lucide-react";

const levels = ["PRIMARY", "SECONDARY", "UNDERGRADUATE", "POSTGRADUATE"];
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function Signup() {
  const [type, setType] = useState("student");
  const [formData, setFormData] = useState({});
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    setFormData({});
    setAvailability([]);
  }, [type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleAvailability = (day) => {
    setAvailability((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      availability: type === "tutor" ? availability : undefined,
    };
    console.log("Submitting", payload);
    // send to backend...
  };

  const handleGoogleSignup = () => {
    console.log("Google signup clicked");
    // Implement Google OAuth here
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%)",
        padding: "2rem 0",
      }}
    >
      <div className="container" style={{ maxWidth: "800px" }}>
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
          <h1 className="fw-bold text-dark mb-2">Join EduBridge</h1>
          <p className="text-muted">
            Connect with{" "}
            {type === "tutor"
              ? "students and impact lives"
              : "tutors and start your learning journey"}
          </p>
        </div>

        {/* Type Toggle - FIXED STYLING */}
        <div
          className="card mb-4"
          style={{ border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
        >
          <div className="card-body p-3">
            <div className="row g-2">
              <div className="col-6">
                <button
                  type="button"
                  onClick={() => setType("student")}
                  className="btn w-100 py-3 fw-semibold"
                  style={{
                    borderRadius: "12px",
                    background:
                      type === "student"
                        ? "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)"
                        : "#f8f9fa",
                    color: type === "student" ? "white" : "#6c757d",
                    border: type === "student" ? "none" : "1px solid #e9ecef",
                    boxShadow:
                      type === "student"
                        ? "0 4px 15px rgba(33, 150, 243, 0.3)"
                        : "none",
                    transition: "all 0.3s ease",
                    transform: type === "student" ? "translateY(-1px)" : "none",
                  }}
                >
                  <User size={18} className="me-2" />
                  Student
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={() => setType("tutor")}
                  className="btn w-100 py-3 fw-semibold"
                  style={{
                    borderRadius: "12px",
                    background:
                      type === "tutor"
                        ? "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)"
                        : "#f8f9fa",
                    color: type === "tutor" ? "white" : "#6c757d",
                    border: type === "tutor" ? "none" : "1px solid #e9ecef",
                    boxShadow:
                      type === "tutor"
                        ? "0 4px 15px rgba(33, 150, 243, 0.3)"
                        : "none",
                    transition: "all 0.3s ease",
                    transform: type === "tutor" ? "translateY(-1px)" : "none",
                  }}
                >
                  <Star size={18} className="me-2" />
                  Tutor
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div
          className="card"
          style={{
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            borderRadius: "16px",
          }}
        >
          {/* Google Signup Button */}
          <div className="card-body border-bottom">
            <button
              type="button"
              onClick={handleGoogleSignup}
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

          {/* Form */}
          <div className="card-body">
            <div className="row g-3">
              {/* Personal Information */}
              <div className="col-md-6">
                <div className="position-relative">
                  <User
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="firstName"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="First Name"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="position-relative">
                  <User
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="lastName"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="Last Name"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="position-relative">
                  <User
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="middleName"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="Middle Name (Optional)"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="position-relative">
                  <Mail
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="email"
                    type="email"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="Email Address"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="position-relative">
                  <Lock
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="password"
                    type="password"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="Password"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <select
                  name="gender"
                  className="form-select py-3"
                  style={{ borderRadius: "8px" }}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="col-md-6">
                <div className="position-relative">
                  <MapPin
                    size={20}
                    className="position-absolute text-muted"
                    style={{ left: "12px", top: "12px" }}
                  />
                  <input
                    name="location"
                    className="form-control py-3"
                    style={{ paddingLeft: "40px", borderRadius: "8px" }}
                    placeholder="Location (City)"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <input
                  name="profilePictureUrl"
                  className="form-control py-3"
                  style={{ borderRadius: "8px" }}
                  placeholder="Profile Picture URL (Optional)"
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Student Fields */}
            {type === "student" && (
              <div className="mt-4">
                <h5 className="fw-bold mb-3">Student Information</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <select
                      name="level"
                      className="form-select py-3"
                      onChange={handleChange}
                      style={{ borderRadius: "8px" }}
                      required
                    >
                      <option value="">Select Academic Level</option>
                      {levels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <input
                      name="preferredSubjects"
                      className="form-control py-3"
                      style={{ borderRadius: "8px" }}
                      placeholder="Preferred Subjects (e.g. Math, English)"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tutor Fields */}
            {type === "tutor" && (
              <div className="mt-4">
                <h5 className="fw-bold mb-3">Tutor Information</h5>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <input
                      name="subject"
                      className="form-control py-3"
                      placeholder="Subject Expertise"
                      onChange={handleChange}
                      style={{ borderRadius: "8px" }}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <input
                      name="ratePerHour"
                      type="number"
                      className="form-control py-3"
                      placeholder="Rate Per Hour (₦)"
                      onChange={handleChange}
                      style={{ borderRadius: "8px" }}
                    />
                  </div>
                  <div className="col-md-12">
                    <input
                      name="introVideoUrl"
                      className="form-control py-3"
                      placeholder="Intro Video URL (Optional)"
                      onChange={handleChange}
                      style={{ borderRadius: "8px" }}
                    />
                  </div>
                  <div className="col-md-12">
                    <textarea
                      name="bio"
                      className="form-control"
                      style={{ borderRadius: "8px" }}
                      rows="4"
                      placeholder="Tell us about yourself and your teaching experience..."
                      onChange={handleChange}
                    ></textarea>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <Calendar size={20} className="text-muted me-2" />
                    <h6 className="mb-0 fw-semibold">Weekly Availability</h6>
                  </div>
                  <div className="row g-2">
                    {weekdays.map((day) => (
                      <div className="col-6 col-md-4" key={day}>
                        <div
                          className={`p-3 border rounded-3 ${
                            availability.includes(day)
                              ? "bg-primary bg-opacity-10 border-primary text-primary"
                              : "bg-light border-secondary"
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => toggleAvailability(day)}
                        >
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input me-2"
                              id={`day-${day}`}
                              checked={availability.includes(day)}
                              onChange={() => toggleAvailability(day)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`day-${day}`}
                            >
                              {day}
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSubmit}
                className="btn btn-primary w-100 py-3 fw-semibold"
                style={{
                  borderRadius: "8px",
                  background:
                    "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)",
                }}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-muted">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary fw-medium text-decoration-none"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
