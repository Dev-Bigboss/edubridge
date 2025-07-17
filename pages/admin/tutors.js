import AdminLayout from "@/components/layout/AdminLayout";
import { useState } from "react";
import {
  Eye,
  User,
  BookOpen,
  Calendar,
  Check,
  X,
} from "lucide-react";

const mockTutors = [
  {
    id: 1,
    name: "Emeka Jude",
    email: "emeka@example.com",
    subjects: ["Chemistry", "Biology"],
    status: "pending",
    joined: "2024-11-01",
    avatar: "/assets/img/profile.jpg",
    availability: {
      days: ["Monday", "Wednesday", "Friday"],
      hours: "10:00 AM - 2:00 PM",
    },
  },
  {
    id: 2,
    name: "Zainab Musa",
    email: "zainab@example.com",
    subjects: ["English", "Literature"],
    status: "approved",
    joined: "2024-09-21",
    avatar: "/assets/img/profile.jpg",
    availability: {
      days: ["Tuesday", "Thursday"],
      hours: "3:00 PM - 6:00 PM",
    },
  },
];

export default function AdminTutorsPage() {
  const [tab, setTab] = useState("pending");
  const [modalType, setModalType] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(null);

  const handleApprove = (id) => {
    alert(`Tutor with ID ${id} approved.`);
  };

  const filteredTutors = mockTutors.filter((tutor) =>
    tab === "all" ? true : tutor.status === tab
  );

  return (
    <AdminLayout>
      <div className="mb-4">
        <h3 className="fw-bold">Tutors Management</h3>
        <p className="text-muted">View and manage registered tutors</p>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "pending" ? "active" : ""}`}
            onClick={() => setTab("pending")}
          >
            Pending Requests
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "approved" ? "active" : ""}`}
            onClick={() => setTab("approved")}
          >
            Approved Tutors
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            All Tutors
          </button>
        </li>
      </ul>

      {/* Tutors List */}
      <div className="row g-4">
        {filteredTutors.map((tutor) => (
          <div className="col-md-6" key={tutor.id}>
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex gap-3 align-items-start">
                <img
                  src={tutor.avatar}
                  alt={tutor.name}
                  className="rounded-circle"
                  width={48}
                  height={48}
                  style={{ objectFit: "cover" }}
                />
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-1">{tutor.name}</h6>
                  <p className="text-muted mb-1 small">{tutor.email}</p>
                  <div className="mb-2">
                    <strong>Subjects:</strong>{" "}
                    <span>{tutor.subjects.join(", ")}</span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setSelectedTutor(tutor);
                        setModalType("view");
                      }}
                    >
                      <Eye size={14} className="me-1" />
                      View
                    </button>
                    {tutor.status === "pending" && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleApprove(tutor.id)}
                      >
                        <Check size={14} className="me-1" />
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalType === "view" && selectedTutor && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Tutor Details</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setSelectedTutor(null);
                    setModalType("");
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <img
                    src={selectedTutor.avatar}
                    alt={selectedTutor.name}
                    className="rounded-circle mb-2"
                    width={60}
                    height={60}
                    style={{ objectFit: "cover" }}
                  />
                  <h5 className="fw-bold">{selectedTutor.name}</h5>
                  <p className="text-muted mb-1">{selectedTutor.email}</p>
                  <span className="badge bg-warning text-dark text-capitalize">
                    {selectedTutor.status}
                  </span>
                </div>

                <div className="mb-3">
                  <BookOpen size={16} className="text-primary me-2" />
                  <strong>Subjects:</strong>{" "}
                  <span>{selectedTutor.subjects.join(", ")}</span>
                </div>

                <div className="mb-3">
                  <Calendar size={16} className="text-success me-2" />
                  <strong>Availability:</strong>
                  <ul className="ps-3 mb-1">
                    {selectedTutor.availability.days.map((day, i) => (
                      <li key={i}>{day}</li>
                    ))}
                  </ul>
                  <small className="text-muted">
                    Hours: {selectedTutor.availability.hours}
                  </small>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSelectedTutor(null);
                    setModalType("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
