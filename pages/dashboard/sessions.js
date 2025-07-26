import TutorLayout from "@/components/layout/TutorLayout";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  MessageSquare,
} from "lucide-react";

export default function TutorSessionsPage() {
  const [requests, setRequests] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [modal, setModal] = useState({ type: "", request: null });

  useEffect(() => {
    // mock booking requests
    setRequests([
      {
        id: 1,
        student: "Ada Obi",
        subject: "Mathematics",
        date: "2025-07-21",
        preferredTime: "10:00 AM",
        status: "pending",
      },
      {
        id: 2,
        student: "David Yusuf",
        subject: "Physics",
        date: "2025-07-22",
        preferredTime: "1:00 PM",
        status: "pending",
      },
    ]);

    // mock sessions
    setUpcoming([
      {
        id: 3,
        student: "Chuka Nnamdi",
        subject: "Biology",
        date: "2025-07-20",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
      },
    ]);

    setPast([
      {
        id: 4,
        student: "Grace Eze",
        subject: "English",
        date: "2025-07-15",
        startTime: "12:00 PM",
        endTime: "1:00 PM",
        status: "completed",
      },
      {
        id: 5,
        student: "Ifeanyi Uche",
        subject: "Chemistry",
        date: "2025-07-10",
        startTime: "4:00 PM",
        endTime: "5:00 PM",
        status: "missed",
      },
    ]);
  }, []);

  const handleAccept = (id, startTime, endTime) => {
    alert(`Accepted request ${id} with time ${startTime} to ${endTime} (mock)`);
    setModal({ type: "", request: null });
  };

  const handleDecline = (id, reason) => {
    alert(`Declined request ${id} for reason: ${reason} (mock)`);
    setModal({ type: "", request: null });
  };

  return (
    <TutorLayout>
      <div className="mb-4">
        <h3 className="fw-bold">My Sessions</h3>
        <p className="text-muted">Manage requests and sessions</p>
      </div>

      {/* Booking Requests */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-transparent border-bottom">
          <h5 className="fw-semibold mb-0">📥 Booking Requests</h5>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <p className="text-muted text-center">No pending requests.</p>
          ) : (
            <div className="vstack gap-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="d-flex justify-content-between align-items-center border rounded p-3"
                >
                  <div>
                    <h6 className="fw-semibold mb-1">{req.subject}</h6>
                    <small className="text-muted">
                      {req.student} • {req.date} at {req.preferredTime}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => setModal({ type: "accept", request: req })}
                    >
                      <CheckCircle size={16} className="me-1" />
                      Accept
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        setModal({ type: "decline", request: req })
                      }
                    >
                      <XCircle size={16} className="me-1" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-transparent border-bottom">
          <h5 className="fw-semibold mb-0">📆 Upcoming Sessions</h5>
        </div>
        <div className="card-body">
          {upcoming.length === 0 ? (
            <p className="text-muted text-center">No upcoming sessions.</p>
          ) : (
            <div className="vstack gap-3">
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  className="d-flex justify-content-between border rounded p-3"
                >
                  <div>
                    <h6 className="fw-semibold mb-1">{s.subject}</h6>
                    <small className="text-muted">
                      {s.date} • {s.startTime} to {s.endTime} with {s.student}
                    </small>
                  </div>
                  <button className="btn btn-sm btn-outline-primary">
                    <MessageSquare size={14} className="me-1" />
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Sessions */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom">
          <h5 className="fw-semibold mb-0">📚 Past Sessions</h5>
        </div>
        <div className="card-body">
          {past.length === 0 ? (
            <p className="text-muted text-center">No past sessions.</p>
          ) : (
            <ul className="list-group">
              {past.map((s) => (
                <li
                  key={s.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{s.subject}</strong> with {s.student}
                    <div className="small text-muted">
                      {s.date} • {s.startTime} - {s.endTime}
                    </div>
                  </div>
                  <span
                    className={`badge rounded-pill ${
                      s.status === "completed"
                        ? "bg-success"
                        : "bg-secondary text-white"
                    }`}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal.type === "accept" && (
        <ActionModal
          title="Accept Request"
          onClose={() => setModal({ type: "", request: null })}
        >
          <AcceptForm request={modal.request} onSubmit={handleAccept} />
        </ActionModal>
      )}
      {modal.type === "decline" && (
        <ActionModal
          title="Decline Request"
          onClose={() => setModal({ type: "", request: null })}
        >
          <DeclineForm request={modal.request} onSubmit={handleDecline} />
        </ActionModal>
      )}
    </TutorLayout>
  );
}

// Modal Wrapper
function ActionModal({ title, children, onClose }) {
  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Accept Form
function AcceptForm({ request, onSubmit }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(request.id, startTime, endTime);
      }}
    >
      <div className="mb-3">
        <label className="form-label">Start Time</label>
        <input
          type="time"
          className="form-control"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">End Time</label>
        <input
          type="time"
          className="form-control"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-success w-100">
        <Send size={16} className="me-2" />
        Confirm
      </button>
    </form>
  );
}

// Decline Form
function DeclineForm({ request, onSubmit }) {
  const [reason, setReason] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(request.id, reason);
      }}
    >
      <div className="mb-3">
        <label className="form-label">Reason for Declining</label>
        <textarea
          className="form-control"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-danger w-100">
        <XCircle size={16} className="me-2" />
        Submit Decline
      </button>
    </form>
  );
}
