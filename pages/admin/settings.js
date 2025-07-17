import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import { Settings, User, Lock, Sliders } from "lucide-react";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@edubridge.com",
    phone: "+2348012345678",
  });

  const [platformSettings, setPlatformSettings] = useState({
    sessionDuration: 60,
    defaultRate: 3000,
    enableNotifications: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    alert("Profile updated successfully (mock)");
  };

  const handlePlatformSubmit = (e) => {
    e.preventDefault();
    alert("Platform settings saved (mock)");
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("New passwords do not match!");
      return;
    }
    alert("Password changed (mock)");
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          <Settings size={24} className="me-2" />
          Settings
        </h2>
        <p className="text-muted mb-0">
          Manage your profile and platform preferences
        </p>
      </div>

      <div className="row g-4">
        {/* Admin Profile Settings */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
              <User size={18} />
              <strong>Profile Settings</strong>
            </div>
            <div className="card-body">
              <form onSubmit={handleProfileSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Save Profile
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Platform Settings */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
              <Sliders size={18} />
              <strong>Platform Settings</strong>
            </div>
            <div className="card-body">
              <form onSubmit={handlePlatformSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Default Session Duration (mins)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={platformSettings.sessionDuration}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        sessionDuration: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Default Hourly Rate (₦)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={platformSettings.defaultRate}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        defaultRate: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={platformSettings.enableNotifications}
                    onChange={(e) =>
                      setPlatformSettings({
                        ...platformSettings,
                        enableNotifications: e.target.checked,
                      })
                    }
                  />
                  <label className="form-check-label fw-semibold">
                    Enable Email Notifications
                  </label>
                </div>
                <button type="submit" className="btn btn-success w-100">
                  Save Settings
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-transparent border-bottom d-flex align-items-center gap-2">
              <Lock size={18} />
              <strong>Change Password</strong>
            </div>
            <div className="card-body">
              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                    required
                  />
                </div>
                <button type="submit" className="btn btn-secondary w-100">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
