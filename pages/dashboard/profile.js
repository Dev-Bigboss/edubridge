import { useState } from "react";
import TutorLayout from "@/components/layout/TutorLayout";
import {
  Upload,
  Users,
  Calendar,
  BookOpen,
  MapPin,
  DollarSign,
  Video,
  Lock,
  Clock,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    avatar: "/assets/img/profile.jpg",
    firstName: "Chinedu",
    lastName: "Okoro",
    email: "chinedu.okoro@example.com",
    location: "Lagos, Nigeria",
    subjects: ["Mathematics", "Physics"],
    availability: {
      Monday: { active: true, from: "09:00", to: "12:00" },
      Wednesday: { active: true, from: "14:00", to: "16:00" },
      Friday: { active: true, from: "10:00", to: "13:00" },
    },
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
      availability: {
        ...prev.availability,
        [day]: prev.availability?.[day]
          ? {
              ...prev.availability[day],
              active: !prev.availability[day].active,
            }
          : { active: true, from: "08:00", to: "10:00" },
      },
    }));
  };

  const handleTimeChange = (day, type, value) => {
    setProfile((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: {
          ...prev.availability?.[day],
          [type]: value,
        },
      },
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
        {/* Avatar & Basic Info */}
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

        {/* Personal Info */}
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

        {/* Subjects and Rate */}
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
              />
            </div>
          </div>
        </div>

        {/* Weekly Availability with Times */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label fw-medium">Weekly Availability</label>
            <div className="row g-3">
              {weekdays.map((day) => (
                <div className="col-md-6" key={day}>
                  <div className="border rounded p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <label
                        className={`fw-semibold ${
                          profile.availability?.[day]?.active
                            ? "text-primary"
                            : "text-muted"
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </label>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={profile.availability?.[day]?.active || false}
                        onChange={() => toggleDay(day)}
                      />
                    </div>
                    {profile.availability?.[day]?.active && (
                      <div className="d-flex gap-2 mt-2">
                        <div className="flex-fill">
                          <label className="form-label small mb-1">From</label>
                          <input
                            type="time"
                            className="form-control"
                            value={profile.availability[day].from}
                            onChange={(e) =>
                              handleTimeChange(day, "from", e.target.value)
                            }
                          />
                        </div>
                        <div className="flex-fill">
                          <label className="form-label small mb-1">To</label>
                          <input
                            type="time"
                            className="form-control"
                            value={profile.availability[day].to}
                            onChange={(e) =>
                              handleTimeChange(day, "to", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
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

        {/* Password */}
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
