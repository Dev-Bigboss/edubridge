import StudentLayout from "@/components/layout/StudentLayout";
import {
  Calendar,
  Clock,
  Star,
  Video,
  BookOpen,
  Send,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const mockSessions = [
  {
    id: 1,
    subject: "Mathematics",
    tutor: "Mr. Adewale",
    date: "2025-07-10",
    time: "10:00 AM",
    duration: "1hr",
    type: "Online",
    status: "completed",
    rated: false,
    tutorAvatar: "/assets/img/profile.jpg",
  },
  {
    id: 2,
    subject: "Biology",
    tutor: "Ms. Zainab",
    date: "2025-07-12",
    time: "3:00 PM",
    duration: "1.5hrs",
    type: "In-person",
    status: "upcoming",
    rated: false,
    tutorAvatar: "/assets/img/profile.jpg",
  },
  {
    id: 3,
    subject: "English",
    tutor: "Mrs. Obi",
    date: "2025-07-05",
    time: "12:00 PM",
    duration: "1hr",
    type: "Online",
    status: "completed",
    rated: true,
    tutorAvatar: "/assets/img/profile.jpg",
  },
];

export default function StudentSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [ratingModal, setRatingModal] = useState(null); // session to rate
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setSessions(mockSessions);

    // Automatically find any completed session that hasn’t been rated
    const unratedCompleted = mockSessions.find(
      (s) => s.status === "completed" && !s.rated
    );
    if (unratedCompleted) setRatingModal(unratedCompleted);
  }, []);

  const handleSubmitRating = () => {
    alert(`Rated ${ratingModal.tutor} with ${rating} stars: ${comment}`);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === ratingModal.id ? { ...s, rated: true } : s
      )
    );
    setRatingModal(null);
    setRating(0);
    setComment("");
  };

  return (
    <StudentLayout>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Your Sessions</h3>
        <p className="text-muted">View your upcoming and completed sessions.</p>
      </div>

      <div className="row g-4">
        {sessions.map((s) => (
          <div key={s.id} className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center mb-3">
                  <img
                    src={s.tutorAvatar}
                    alt={s.tutor}
                    className="rounded-circle me-3"
                    width={50}
                    height={50}
                  />
                  <div>
                    <h6 className="fw-bold mb-0">{s.subject}</h6>
                    <small className="text-muted">{s.tutor}</small>
                  </div>
                </div>

                <div className="row text-muted small mb-3">
                  <div className="col-6">
                    <Calendar size={14} className="me-1" />
                    {new Date(s.date).toLocaleDateString()}
                  </div>
                  <div className="col-6">
                    <Clock size={14} className="me-1" />
                    {s.time} • {s.duration}
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-auto">
                  <span
                    className={`badge text-bg-${
                      s.status === "completed" ? "success" : "primary"
                    }`}
                  >
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>

                  {s.status === "upcoming" ? (
                    <button className="btn btn-sm btn-outline-primary">
                      <Video size={14} className="me-1" />
                      Join Class
                    </button>
                  ) : s.rated ? (
                    <span className="text-success d-flex align-items-center gap-1">
                      <CheckCircle size={16} /> Rated
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => setRatingModal(s)}
                    >
                      <Star size={14} className="me-1" />
                      Rate Tutor
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Rating Modal */}
      {ratingModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title">Rate {ratingModal.tutor}</h5>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <img
                    src={ratingModal.tutorAvatar}
                    alt={ratingModal.tutor}
                    className="rounded-circle mb-2"
                    width={60}
                    height={60}
                  />
                  <h6>{ratingModal.subject}</h6>
                </div>

                <div className="mb-3 text-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      onClick={() => setRating(star)}
                      size={28}
                      className={`me-1 cursor-pointer ${
                        rating >= star ? "text-warning" : "text-muted"
                      }`}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </div>

                <div className="mb-3">
                  <textarea
                    className="form-control"
                    placeholder="Leave a comment (optional)"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="d-flex justify-content-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitRating}
                    disabled={rating === 0}
                  >
                    <Send size={16} className="me-1" />
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
