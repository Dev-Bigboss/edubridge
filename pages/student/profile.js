import { useEffect, useState } from "react";
import { User, Mail, BookOpen, Calendar, Upload } from "lucide-react";
import { useGetStudentProfile, useGetSubjects } from "@/hooks/queries";
import { useUpdateMenteeProfile, useFileUpload } from "@/hooks/mutations";
import queryClient from "@/lib/queryClient";
import StudentLayout from "@/components/layout/StudentLayout";
import SkeletonLoader from "@/components/skeletons/dashboard";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const { data: profileData, isLoading: loadingProfile } =
    useGetStudentProfile();
  const { data: subjectsData, isLoading: loadingSubjects } = useGetSubjects();
const updateProfileMutation = useUpdateMenteeProfile();
  const fileUploadMutation = useFileUpload();

  const subjects = subjectsData?.data?.data || [];
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subjects: [],
    availability: "",
    goals: "",
    avatar: "/assets/img/profile.jpg",
  });

  useEffect(() => {
    if (profileData?.data) {
      setProfile({
        firstName: profileData.data.user.firstName || "",
        lastName: profileData.data.user.lastName || "",
        email: profileData.data.user.email || "",
        subjects: profileData.data.preferredSubjects || [],
        location: profileData.data.location || "",
        goals: profileData.data.goals || "",
        avatar: profileData.data.profilePictureUrl || "/assets/img/profile.jpg",
      });
    }
  }, [profileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]:
        name === "subjects" ? value.split(",").map((id) => id.trim()) : value,
    }));
  };

  const handleSubjectChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );
    setProfile((prev) => ({
      ...prev,
      subjects: selectedOptions,
    }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { fileUrl } = await fileUploadMutation.mutateAsync(file);
        setProfile((prev) => ({ ...prev, avatar: fileUrl }));
      } catch (error) {
        toast.error(`Failed to upload avatar: ${error.message || "Unknown error"}`);
      }
    }
  };

const handleSave = async (e) => {
  e.preventDefault();

  if (!profileData?.data) return;

  const original = {
    firstName: profileData.data.user.firstName || "",
    lastName: profileData.data.user.lastName || "",
    email: profileData.data.user.email || "",
    preferredSubjects: profileData.data.preferredSubjects || [],
    location: profileData.data.location || "",
    goals: profileData.data.goals || "",
    profilePictureUrl:
      profileData.data.profilePictureUrl || "/assets/img/profile.jpg",
  };

  const updated = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    preferredSubjects: profile.subjects,
    location: profile.location,
    goals: profile.goals,
    profilePictureUrl: profile.avatar,
  };

  // Only include changed fields
  const diffPayload = Object.keys(updated).reduce((acc, key) => {
    const originalValue = original[key];
    const updatedValue = updated[key];

    // Deep compare for arrays (subjects)
    if (Array.isArray(updatedValue)) {
      const arraysEqual =
        Array.isArray(originalValue) &&
        originalValue.length === updatedValue.length &&
        originalValue.every((v, i) => v === updatedValue[i]);

      if (!arraysEqual) acc[key] = updatedValue;
    } else if (originalValue !== updatedValue) {
      acc[key] = updatedValue;
    }

    return acc;
  }, {});

  if (Object.keys(diffPayload).length === 0) {
    toast.info("No changes to save.");
    return;
  }

  updateProfileMutation.mutate(diffPayload);
};

  return (
    <StudentLayout>
      <div className="container">
        {loadingProfile || loadingSubjects ? (
          <SkeletonLoader type="profile" />
        ) : (
          <>
            <div className="mb-4">
              <h3 className="fw-bold">My Profile</h3>
              <p className="text-muted">Manage your profile information</p>
            </div>

            <form onSubmit={handleSave}>
              <div className="row g-4">
                <div className="col-md-4 text-center">
                  <div className="position-relative">
                    <img
                      src={profile.avatar}
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
                        style={{
                          cursor: fileUploadMutation.isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {fileUploadMutation.isPending ? (
                          <>
                            <Spinner size="sm" className="me-1" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="me-1" />
                            Change Photo
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleAvatarChange}
                          disabled={fileUploadMutation.isPending}
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
                        First Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleChange}
                        required
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <User size={16} className="me-1" />
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleChange}
                        required
                        disabled={updateProfileMutation.isPending}
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
                        value={profile.email}
                        onChange={handleChange}
                        required
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <BookOpen size={16} className="me-1" />
                        Subjects of Interest
                      </label>
                      <select
                        multiple
                        name="subjects"
                        className="form-control"
                        value={profile.subjects}
                        onChange={handleSubjectChange}
                        disabled={loadingSubjects || updateProfileMutation.isPending}
                      >
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name || subject.id}
                          </option>
                        ))}
                      </select>
                      <small className="form-text text-muted">
                        Hold Ctrl (Windows) or Cmd (Mac) to select multiple
                        subjects.
                      </small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <Calendar size={16} className="me-1" />
                        Location
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="location"
                        value={profile.location}
                        onChange={handleChange}
                        disabled={updateProfileMutation.isPending}
                        placeholder="enter location"
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
                        value={profile.goals}
                        onChange={handleChange}
                        disabled={updateProfileMutation.isPending}
                        placeholder="What do you want to achieve with tutoring?"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary px-4 d-flex align-items-center"
                  disabled={updateProfileMutation.isPending || fileUploadMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </StudentLayout>
  );
}
