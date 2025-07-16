import { useEffect, useState } from "react";
import StudentLayout from "@/components/layout/StudentLayout";
import { User, Mail, BookOpen, Calendar, Upload } from "lucide-react";

export default function StudentProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subjects: "",
    availability: "",
    goals: "",
    avatar: "/assets/img/profile.jpg",
  });

  useEffect(() => {
    // Mock pre-filled data (simulate fetching from API)
    setFormData({
      name: "Jane Doe",
      email: "jane@example.com",
      subjects: "Mathematics, English",
      availability: "Weekdays (Evenings)",
      goals: "Improve exam performance and confidence in problem solving",
      avatar: "/assets/img/profile.jpg",
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Mock preview, in real app you'd upload and get a new URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    alert("Profile updated successfully!");
    // Simulate PATCH to backend
    console.log("Updated profile:", formData);
  };

  return (
    <StudentLayout>
      <div className="container">
        <div className="mb-4">
          <h3 className="fw-bold">My Profile</h3>
          <p className="text-muted">Manage your profile information</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="row g-4">
            <div className="col-md-4 text-center">
              <div className="position-relative">
                <img
                  src={formData.avatar}
                  alt="Profile"
                  className="rounded-circle mb-3"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                  }}
                />
                <div>
                  <label
                    className="btn btn-sm btn-outline-primary"
                    style={{ cursor: "pointer" }}
                  >
                    <Upload size={16} className="me-1" />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="col-md-8">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <User size={16} className="me-1" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <Mail size={16} className="me-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <BookOpen size={16} className="me-1" />
                    Subjects of Interest
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="subjects"
                    value={formData.subjects}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <Calendar size={16} className="me-1" />
                    Availability
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">
                    Learning Goals
                  </label>
                  <textarea
                    name="goals"
                    className="form-control"
                    rows={4}
                    value={formData.goals}
                    onChange={handleChange}
                    placeholder="What do you want to achieve with tutoring?"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 d-flex justify-content-end">
            <button type="submit" className="btn btn-primary px-4">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
}
