import { useState, useEffect } from "react";
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
import { useGetTutorProfile, useGetSubjects } from "@/hooks/queries";
import { useFileUpload, useUpdateMentorProfile } from "@/hooks/mutations";
import { useAuthStore } from "@/store/zustand";
import Loader from "@/components/Loader";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { data: tutorDetails, isLoading: loadingTutor } = useGetTutorProfile();
  const { data: subjectsData, isLoading: loadingSubjects } = useGetSubjects();
  const updateProfileMutation = useUpdateMentorProfile();
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileUploadMutation = useFileUpload(setUploadProgress);
const [initialProfile, setInitialProfile] = useState(null);

const [profile, setProfile] = useState({
  profilePictureUrl: "/assets/img/profile.jpg",
  firstName: "",
  lastName: "",
  email: "",
  location: "",
  competencySubjects: [],
  availability: {},
  bio: "",
  ratePerHour: 0,
  introVideoUrl: "",
  password: "",
  confirmPassword: "",
});


  const [uploadStatus, setUploadStatus] = useState({
    profilePictureUrl: null,
    video: null,
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

useEffect(() => {
  if (tutorDetails?.data) {
    const data = tutorDetails.data;
    const availability = weekdays.reduce((acc, day) => {
      const slot = data.slots?.find((s) => s.day === day);
      if (slot) {
        acc[day] = {
          active: true,
          from: slot.startTime.slice(0, 5),
          to: slot.endTime.slice(0, 5),
        };
      }
      return acc;
    }, {});

const formattedProfile = {
  profilePictureUrl: data.profilePictureUrl || "/assets/img/profile.jpg",
  firstName: data.user.firstName || "",
  lastName: data.user.lastName || "",
  email: data.user.email || "",
  location: data.location || "",
  competencySubjects:
    data.competencySubjects?.map((cs) => ({
      subjectId: cs.subjectId,
    })) || [],
  availability,
  bio: data.bio || "",
  ratePerHour: Number(data.ratePerHour) || 0,
  introVideoUrl: data.introVideoUrl || "",
  password: "",
  confirmPassword: "",
};


    setProfile(formattedProfile);
    setInitialProfile(formattedProfile); // keep a baseline for comparison
  }
}, [tutorDetails]);


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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadStatus((prev) => ({ ...prev, profilePictureUrl: "uploading" }));
        const { fileUrl } = await fileUploadMutation.mutateAsync(file);
        setProfile((prev) => ({ ...prev, profilePictureUrl: fileUrl }));
        setUploadStatus((prev) => ({ ...prev, profilePictureUrl: "success" }));
      } catch (error) {
        setUploadStatus((prev) => ({ ...prev, profilePictureUrl: "error" }));
        toast.error("Failed to upload avatar");
      }
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadStatus((prev) => ({ ...prev, video: "uploading" }));
        setUploadProgress(0);
        const { fileUrl } = await fileUploadMutation.mutateAsync(file);
        setProfile((prev) => ({ ...prev, introVideoUrl: fileUrl }));
        setUploadStatus((prev) => ({ ...prev, video: "success" }));
        setUploadProgress(null);
      } catch (error) {
        setUploadStatus((prev) => ({ ...prev, video: "error" }));
        setUploadProgress(null);
        toast.error(error," :Failed to upload video");
      }
    }
  };

const handleSubmit = (e) => {
  e.preventDefault();

  if (profile.password !== profile.confirmPassword) {
    toast.error("Passwords do not match");
    return;
  }

  // Build diff payload
  let payload = {};
  for (const key in profile) {
    if (key === "confirmPassword") continue; // skip confirmPassword
    if (profile[key] !== initialProfile[key] && profile[key] !== "") {
      payload[key] = profile[key];
    }
  }

  // Special case: slots need fresh calculation
  if (
    JSON.stringify(profile.availability) !==
    JSON.stringify(initialProfile.availability)
  ) {
    payload.slots = weekdays
      .filter((day) => profile.availability[day]?.active)
      .map((day) => ({
        day,
        startTime: profile.availability[day].from + ":00",
        endTime: profile.availability[day].to + ":00",
      }));
  }

  // Password handling (only if provided)
  if (profile.password) {
    payload.password = profile.password;
  }

  if (Object.keys(payload).length === 0) {
    toast.info("No changes to update");
    return;
  }

  updateProfileMutation.mutate(payload);
};


  if (loadingTutor || loadingSubjects)
    return <TutorLayout>Loading...</TutorLayout>;

  return (
    <TutorLayout>
      <div className="position-relative">
        {uploadStatus.video === "uploading" && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex flex-column align-items-center justify-content-center"
            style={{ zIndex: 1050 }}
          >
            <Loader size="lg" />
            <h4 className="text-white mt-3">Uploading Video...</h4>
            {uploadProgress !== null && (
              <div className="progress mt-3 w-50">
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {uploadProgress}%
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <h3 className="fw-bold mb-2">Profile Settings</h3>
          <p className="text-muted">Update your information and preferences</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* profilePictureUrl & Basic Info */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body d-flex align-items-center gap-4">
              <div className="position-relative">
                <img
                  src={profile.profilePictureUrl}
                  alt="profilePictureUrl"
                  className="rounded-circle"
                  width={80}
                  height={80}
                  style={{ objectFit: "cover" }}
                />
                {uploadStatus.profilePictureUrl === "uploading" && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 rounded-circle">
                    <Loader size="sm" />
                  </div>
                )}
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1">
                  {profile.firstName} {profile.lastName}
                </h5>
                <p className="text-muted mb-2">{profile.email}</p>
                <label className="btn btn-sm btn-outline-primary">
                  <Upload size={14} className="me-1" />
                  {uploadStatus.profilePictureUrl === "uploading"
                    ? "Uploading..."
                    : "Change Avatar"}
                  <input
                    type="file"
                    hidden
                    onChange={handleAvatarChange}
                    accept="image/*"
                  />
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
                  disabled={uploadStatus.video === "uploading"}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Last Name</label>
                <input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  className="form-control"
                  disabled={uploadStatus.video === "uploading"}
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
                  disabled={uploadStatus.video === "uploading"}
                />
              </div>
            </div>
          </div>

          {/* Subject dropdown and Rate */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body row g-3">
              <div className="col-md-8">
                <label className="form-label">Subjects</label>
                <select
                  multiple
                  name="competencySubjects"
                  value={profile.competencySubjects.map((s) => s.subjectId)}
                  onChange={(e) => {
                    const selectedOptions = Array.from(
                      e.target.selectedOptions,
                      (opt) => ({
                        subjectId: opt.value,
                      })
                    );
                    setProfile((prev) => ({
                      ...prev,
                      competencySubjects: selectedOptions,
                    }));
                  }}
                  className="form-select"
                  disabled={uploadStatus.video === "uploading"}
                >
                  {subjectsData?.data?.data?.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.id}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple
                </small>
              </div>

              <div className="col-md-4">
                <label className="form-label">Rate Per Hour (₦)</label>
                <input
                  name="ratePerHour"
                  type="number"
                  className="form-control"
                  value={profile.ratePerHour}
                  onChange={handleChange}
                  disabled={uploadStatus.video === "uploading"}
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Intro Video</label>
                <div className="input-group">
                  <input
                    name="introVideoUrl"
                    value={profile.introVideoUrl}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter video URL or upload a file"
                    disabled={uploadStatus.video === "uploading"}
                  />
                  <label className="btn btn-outline-primary">
                    <Upload size={14} className="me-1" />
                    {uploadStatus.video === "uploading"
                      ? "Uploading..."
                      : "Upload Video"}
                    <input
                      type="file"
                      hidden
                      onChange={handleVideoUpload}
                      accept="video/*"
                      disabled={uploadStatus.video === "uploading"}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Availability with Times */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <label className="form-label fw-medium">
                Weekly Availability
              </label>
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
                          style={{
                            cursor:
                              uploadStatus.video === "uploading"
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() =>
                            uploadStatus.video !== "uploading" && toggleDay(day)
                          }
                        >
                          {day}
                        </label>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={profile.availability?.[day]?.active || false}
                          onChange={() =>
                            uploadStatus.video !== "uploading" && toggleDay(day)
                          }
                          disabled={uploadStatus.video === "uploading"}
                        />
                      </div>
                      {profile.availability?.[day]?.active && (
                        <div className="d-flex gap-2 mt-2">
                          <div className="flex-fill">
                            <label className="form-label small mb-1">
                              From
                            </label>
                            <input
                              type="time"
                              className="form-control"
                              value={profile.availability[day].from}
                              onChange={(e) =>
                                uploadStatus.video !== "uploading" &&
                                handleTimeChange(day, "from", e.target.value)
                              }
                              disabled={uploadStatus.video === "uploading"}
                            />
                          </div>
                          <div className="flex-fill">
                            <label className="form-label small mb-1">To</label>
                            <input
                              type="time"
                              className="form-control"
                              value={profile.availability[day].to}
                              onChange={(e) =>
                                uploadStatus.video !== "uploading" &&
                                handleTimeChange(day, "to", e.target.value)
                              }
                              disabled={uploadStatus.video === "uploading"}
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
                disabled={uploadStatus.video === "uploading"}
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
                  disabled={uploadStatus.video === "uploading"}
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
                  disabled={uploadStatus.video === "uploading"}
                />
              </div>
            </div>
          </div>

          <div className="text-end">
            <button
              type="submit"
              className="btn btn-primary px-4"
              disabled={
                updateProfileMutation.isLoading || fileUploadMutation.isLoading
              }
            >
              {updateProfileMutation.isLoading || fileUploadMutation.isLoading
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </TutorLayout>
  );
}
