import { useState } from "react";
import TutorLayout from "@/components/layout/TutorLayout";
import {
  User,
  Mail,
  Upload,
  Calendar,
  BookOpen,
  MapPin,
  DollarSign,
  Video,
  Lock,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    avatar: "/assets/img/profile.jpg",
    firstName: "Chinedu",
    lastName: "Okoro",
    email: "chinedu.okoro@example.com",
    location: "Lagos, Nigeria",
    subjects: ["Mathematics", "Physics"],
    availability: ["Monday", "Wednesday", "Friday"],
    bio: "Experienced STEM tutor who loves to teach.",
    ratePerHour: 5000,
    introVideoUrl: "https://youtube.com/example",
    password: "",
    confirmPassword: "",
  });

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDay = (day) => {
    setProfile((prev) => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter((d) => d !== day)
        : [...prev.availability, day],
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imgUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar: imgUrl }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Profile updated (mock)");
  };

  return (
    <TutorLayout>
      <div className="mb-4">
        <h3 className="fw-bold mb-2">Profile Settings</h3>
        <p className="text-muted">Update your information and preferences</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Avatar + Summary */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex align-items-center gap-4">
            <img
              src={profile.avatar}
              alt="Avatar"
              className="rounded-circle"
              width={80}
              height={80}
              style={{ objectFit: "cover" }}
            />
            <div className="flex-grow-1">
              <h5 className="mb-1">
                {profile.firstName} {profile.lastName}
              </h5>
              <p className="text-muted mb-2">{profile.email}</p>
              <label className="btn btn-sm btn-outline-primary">
                <Upload size={14} className="me-1" />
                Change Avatar
                <input type="file" hidden onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body row g-3">
            <div className="col-md-6">
              <label className="form-label">First Name</label>
              <input
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Last Name</label>
              <input
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="form-control"
                disabled
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Location</label>
              <input
                name="location"
                value={profile.location}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Subjects & Rate */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body row g-3">
            <div className="col-md-8">
              <label className="form-label">Subjects (comma separated)</label>
              <input
                name="subjects"
                value={profile.subjects.join(", ")}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    subjects: e.target.value.split(",").map((s) => s.trim()),
                  }))
                }
                className="form-control"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Rate Per Hour (₦)</label>
              <input
                name="ratePerHour"
                type="number"
                className="form-control"
                value={profile.ratePerHour}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-12">
              <label className="form-label">Intro Video URL (optional)</label>
              <input
                name="introVideoUrl"
                value={profile.introVideoUrl}
                onChange={handleChange}
                className="form-control"
                placeholder="https://youtube.com/example"
              />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label fw-medium">Weekly Availability</label>
            <div className="row g-2">
              {weekdays.map((day) => (
                <div className="col-6 col-sm-4 col-md-3" key={day}>
                  <div
                    className={`p-2 border rounded text-center small ${
                      profile.availability.includes(day)
                        ? "bg-primary text-white"
                        : "bg-light text-muted"
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label">Bio / About Me</label>
            <textarea
              name="bio"
              className="form-control"
              rows={4}
              value={profile.bio}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Change Password */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body row g-3">
            <div className="col-md-6">
              <label className="form-label">New Password</label>
              <input
                name="password"
                type="password"
                value={profile.password}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={profile.confirmPassword}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>

        <div className="text-end">
          <button type="submit" className="btn btn-primary px-4">
            Save Changes
          </button>
        </div>
      </form>
    </TutorLayout>
  );
}
