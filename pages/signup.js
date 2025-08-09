import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  User,
  Mail,
  Lock,
  MapPin,
  BookOpen,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";
import { usePostMenteeSignup, usePostMentorSignup } from "@/hooks/mutations";
// import { useGetUserProfile } from "@/hooks/queries";

const levels = ["PRIMARY", "SECONDARY", "UNDERGRADUATE", "POSTGRADUATE"];

const schema = yup.object().shape({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  middleName: yup.string(),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters"),
  gender: yup.string().required("Gender is required"),
  location: yup.string().required("Location is required"),
  profilePictureUrl: yup.string().url("Must be a valid URL").nullable(),
  level: yup.string().when("type", {
    is: "student",
    then: (schema) => schema.required("Academic level is required"),
  }),
  preferredSubjects: yup.string(),
  subject: yup.string().when("type", {
    is: "tutor",
    then: (schema) => schema.required("Subject is required"),
  }),
  ratePerHour: yup.string(),
  introVideoUrl: yup.string().url("Must be a valid URL").nullable(),
  bio: yup.string(),
});

export default function Signup() {
  const [type, setType] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  // const { data: userProfile } = useGetUserProfile()

  // console.log(userProfile)
  const menteeSignup = usePostMenteeSignup();
  const mentorSignup = usePostMentorSignup();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    reset();
  }, [type]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      type,
    };

    if (type === "student") {
      menteeSignup.mutate(payload, {
        onSuccess: () => router.push("/student/dashboard"),
      });
    } else {
      mentorSignup.mutate(payload, {
        onSuccess: () => router.push("/dashboard"),
      });
    }
  };

  const loading = menteeSignup.isPending || mentorSignup.isPending;

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

        {/* Type Toggle */}
        <div
          className="card mb-4"
          style={{ border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}
        >
          <div className="card-body p-3 row g-2">
            {["student", "tutor"].map((role) => (
              <div className="col-6" key={role}>
                <button
                  type="button"
                  onClick={() => setType(role)}
                  className="btn w-100 py-3 fw-semibold"
                  style={{
                    borderRadius: "12px",
                    background:
                      type === role
                        ? "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)"
                        : "#f8f9fa",
                    color: type === role ? "white" : "#6c757d",
                    border: type === role ? "none" : "1px solid #e9ecef",
                    boxShadow:
                      type === role
                        ? "0 4px 15px rgba(33, 150, 243, 0.3)"
                        : "none",
                  }}
                >
                  {role === "student" ? (
                    <User size={18} className="me-2" />
                  ) : (
                    <Star size={18} className="me-2" />
                  )}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div
            className="card"
            style={{
              border: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              borderRadius: "16px",
            }}
          >
            <div className="card-body">
              {/* Password visibility toggle logic */}
              {/* Google Signup - commented out */}
              {/* 
              <button type="button" className="btn btn-outline-secondary w-100 py-3 mb-3">
                Continue with Google
              </button>
              */}

              <div className="row g-3">
                {/* First Name */}
                <div className="col-md-6 position-relative">
                  <User
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "16px" }}
                  />
                  <input
                    {...register("firstName")}
                    className="form-control py-3"
                    placeholder="First Name"
                    style={{ paddingLeft: "40px" }}
                  />
                  {errors.firstName && (
                    <small className="text-danger">
                      {errors.firstName.message}
                    </small>
                  )}
                </div>

                {/* Last Name */}
                <div className="col-md-6 position-relative">
                  <User
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "16px" }}
                  />
                  <input
                    {...register("lastName")}
                    className="form-control py-3"
                    placeholder="Last Name"
                    style={{ paddingLeft: "40px" }}
                  />
                  {errors.lastName && (
                    <small className="text-danger">
                      {errors.lastName.message}
                    </small>
                  )}
                </div>

                {/* Middle Name */}
                <div className="col-md-6 position-relative">
                  <User
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "16px" }}
                  />
                  <input
                    {...register("middleName")}
                    className="form-control py-3"
                    placeholder="Middle Name (Optional)"
                    style={{ paddingLeft: "40px" }}
                  />
                </div>

                {/* Email */}
                <div className="col-md-6 position-relative">
                  <Mail
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "18px" }}
                  />
                  <input
                    {...register("email")}
                    className="form-control py-3"
                    placeholder="Email Address"
                    style={{ paddingLeft: "40px" }}
                  />
                  {errors.email && (
                    <small className="text-danger">
                      {errors.email.message}
                    </small>
                  )}
                </div>

                {/* Password with toggle */}
                <div className="col-md-6 position-relative">
                  <Lock
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "16px" }}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="form-control py-3"
                    placeholder="Password"
                    style={{ paddingLeft: "40px", paddingRight: "40px" }}
                  />
                  <span
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </span>
                  {errors.password && (
                    <small className="text-danger">
                      {errors.password.message}
                    </small>
                  )}
                </div>

                {/* Gender */}
                <div className="col-md-6">
                  <select {...register("gender")} className="form-select py-3">
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                  {errors.gender && (
                    <small className="text-danger">
                      {errors.gender.message}
                    </small>
                  )}
                </div>

                {/* Location */}
                <div className="col-md-6 position-relative">
                  <MapPin
                    className="position-absolute text-muted"
                    style={{ top: "12px", left: "16px" }}
                  />
                  <input
                    {...register("location")}
                    className="form-control py-3"
                    placeholder="Location (City)"
                    style={{ paddingLeft: "40px" }}
                  />
                  {errors.location && (
                    <small className="text-danger">
                      {errors.location.message}
                    </small>
                  )}
                </div>

                {/* Profile Picture URL */}
                <div className="col-md-6">
                  <input
                    {...register("profilePictureUrl")}
                    className="form-control py-3"
                    placeholder="Profile Picture URL (Optional)"
                  />
                  {errors.profilePictureUrl && (
                    <small className="text-danger">
                      {errors.profilePictureUrl.message}
                    </small>
                  )}
                </div>
              </div>

              {/* Student Fields */}
              {type === "student" && (
                <div className="row g-3 mt-3">
                  <div className="col-md-6">
                    <select {...register("level")} className="form-select py-3">
                      <option value="">Select Academic Level</option>
                      {levels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                    {errors.level && (
                      <small className="text-danger">
                        {errors.level.message}
                      </small>
                    )}
                  </div>
                  <div className="col-md-6">
                    <input
                      {...register("preferredSubjects")}
                      className="form-control py-3"
                      placeholder="Preferred Subjects (e.g. Math, English)"
                    />
                  </div>
                </div>
              )}

              {/* Tutor Fields */}
              {type === "tutor" && (
                <div className="row g-3 mt-3">
                  <div className="col-md-6">
                    <input
                      {...register("subject")}
                      className="form-control py-3"
                      placeholder="Subject Expertise"
                    />
                    {errors.subject && (
                      <small className="text-danger">
                        {errors.subject.message}
                      </small>
                    )}
                  </div>
                  <div className="col-md-6">
                    <input
                      {...register("ratePerHour")}
                      className="form-control py-3"
                      placeholder="Rate Per Hour (₦)"
                      type="number"
                    />
                  </div>
                  <div className="col-md-6">
                    <input
                      {...register("introVideoUrl")}
                      className="form-control py-3"
                      placeholder="Intro Video URL (Optional)"
                    />
                    {errors.introVideoUrl && (
                      <small className="text-danger">
                        {errors.introVideoUrl.message}
                      </small>
                    )}
                  </div>
                  <div className="col-md-12">
                    <textarea
                      {...register("bio")}
                      className="form-control"
                      rows="4"
                      placeholder="Tell us about your experience..."
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 fw-semibold"
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    background:
                      "linear-gradient(135deg, #2196f3 0%, #3f51b5 100%)",
                    border: "none",
                    boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)",
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          </div>
        </form>

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
