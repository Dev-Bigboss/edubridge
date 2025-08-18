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
import { useGetSubjects } from "@/hooks/queries";

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
  preferredSubjects: yup.array().of(yup.string()),
  subject: yup.string().when("type", {
    is: "tutor",
    then: (schema) => schema.required("Subject is required"),
  }),
  availability: yup.string().when("type", {
    is: "tutor",
    then: (schema) => schema.required("Availability is required"),
  }),
  ratePerHour: yup.string(),
  introVideoUrl: yup.string().url("Must be a valid URL").nullable(),
  bio: yup.string(),
});

export default function Signup() {
  const router = useRouter();
  const [type, setType] = useState("student");
  const [showPassword, setShowPassword] = useState(false);

  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjects();
  const subjects = subjectsRes?.data?.data || [];

  const menteeSignup = usePostMenteeSignup();
  const mentorSignup = usePostMentorSignup();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
  });

  // Get type from URL query
  useEffect(() => {
    if (router.query.type === "tutor") {
      setType("tutor");
    } else {
      setType("student");
    }
  }, [router.query.type]);

  // Reset form when type changes
  useEffect(() => {
    reset();
  }, [type]);

  const onSubmit = (data) => {
    const payload = {
      ...data,
      type,
      preferredSubjects: Array.isArray(data.preferredSubjects)
        ? data.preferredSubjects
        : data.preferredSubjects
        ? [data.preferredSubjects]
        : [],
    };

    if (type === "student") {
      menteeSignup.mutate(payload);
    } else {
      mentorSignup.mutate(payload);
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

                {/* Password */}
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
                    <option value="male">Male</option>
                    <option value="female">Female</option>
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
                  
                </div>
              )}

              {/* Tutor Fields */}
              {type === "tutor" && (
                <div className="row g-3 mt-3">
                  <div className="col-md-6">
                    <select
                      {...register("subject")}
                      className="form-select py-3"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.id}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <small className="text-danger">
                        {errors.subject.message}
                      </small>
                    )}
                  </div>
                  <div className="col-md-6">
                    <select
                      {...register("availability")}
                      className="form-select py-3"
                    >
                      <option value="">Select Availability</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="ADVANCE">Advance Booking</option>
                    </select>
                    {errors.availability && (
                      <small className="text-danger">
                        {errors.availability.message}
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
