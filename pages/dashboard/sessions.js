import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  MessageSquare,
} from "lucide-react";
import { format, parseISO, isPast, isFuture } from "date-fns";
import { toast } from "sonner";
import TutorLayout from "@/components/layout/TutorLayout";
import {
  useGetClassRequestsMentor,
  useGetTutorUpcomingSessions,
} from "@/hooks/queries";
import {
  useAcceptClassRequest,
  useRejectClassRequest,
} from "@/hooks/mutations";
import { useAuthStore } from "@/store/zustand";
import Spinner from "@/components/Spinner";

// Placeholder for past sessions hook (replace with actual hook when available)
const useGetTutorPastSessions = (tutorId) => {
  const { data, isLoading, error } = useGetTutorUpcomingSessions(); // Temporary: reuse upcoming sessions
  return {
    data: data
      ? {
          ...data,
          data: {
            ...data.data,
            data: data?.data?.data.filter((s) =>
              isPast(parseISO(s.session_date))
            ),
          },
        }
      : null,
    isLoading,
    error,
  };
};

export default function TutorSessionsPage() {
  const user = useAuthStore((state) => state.user);
  const {
    data: requestsData,
    isLoading: requestsLoading,
    error: requestsError,
  } = useGetClassRequestsMentor(user?.id);
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    error: upcomingError,
  } = useGetTutorUpcomingSessions();
  const {
    data: pastData,
    isLoading: pastLoading,
    error: pastError,
  } = useGetTutorPastSessions(user?.id);
  const acceptRequest = useAcceptClassRequest();
  const declineRequest = useRejectClassRequest();
  const [modal, setModal] = useState({ type: "", request: null });
  const [requests, setRequests] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (requestsData?.data) {
      console.log("Class Requests Data:", requestsData.data.data); // Debug log
      setRequests(
        requestsData.data.map((req) => ({
          id: req.id,
          student: req.mentee_name || req.mentee.id, // Use mentee_name if available
          subject: req.mentor.subject,
          date: req.prefer_date,
          preferredTime: format(
            parseISO(`2025-08-16T${req.prefer_time}`),
            "h:mm a"
          ),
          duration: req.duration,
          note: req.note,
        }))
      );
    }
    if (requestsError) {
      console.error("Class Requests Error:", requestsError);
      toast.error(requestsError.message || "Failed to load class requests");
    }

    if (upcomingData?.data?.data) {
      console.log("Upcoming Sessions Data:", upcomingData.data.data); // Debug log
      setUpcoming(
        upcomingData.data.data
          .filter(
            (s) =>
              isFuture(parseISO(s.session_date)) ||
              isToday(parseISO(s.session_date))
          )
          .map((s) => ({
            id: s.id,
            student: s.mentee_name,
            subject: s.session_subject,
            date: s.session_date,
            startTime: format(parseISO(`2025-08-16T${s.startTime}`), "h:mm a"),
            endTime: format(parseISO(`2025-08-16T${s.endTime}`), "h:mm a"),
            notes: s.notes,
            link: s.zoom_start_link,
            completed: s.completed,
          }))
      );
    }
    if (upcomingError) {
      console.error("Upcoming Sessions Error:", upcomingError);
      toast.error(upcomingError.message || "Failed to load upcoming sessions");
    }

    if (pastData?.data?.data) {
      console.log("Past Sessions Data:", pastData.data.data); // Debug log
      setPast(
        pastData.data.data.map((s) => ({
          id: s.id,
          student: s.mentee_name,
          subject: s.session_subject,
          date: s.session_date,
          startTime: format(parseISO(`2025-08-16T${s.startTime}`), "h:mm a"),
          endTime: format(parseISO(`2025-08-16T${s.endTime}`), "h:mm a"),
          status: s.completed ? "completed" : "missed", // Adjust based on actual API
        }))
      );
    }
    if (pastError) {
      console.error("Past Sessions Error:", pastError);
      toast.error(pastError.message || "Failed to load past sessions");
    }
  }, [
    requestsData,
    upcomingData,
    pastData,
    requestsError,
    upcomingError,
    pastError,
  ]);

  const handleAccept = (id) => {
    acceptRequest.mutate(id, {
      onSuccess: () => {
        setModal({ type: "", request: null });
      },
    });
  };

  const handleDecline = (id, reason) => {
    declineRequest.mutate(id, {
      onSuccess: () => {
        setModal({ type: "", request: null });
      },
    });
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
          {requestsLoading ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : requestsError ? (
            <div className="alert alert-danger">
              Failed to load requests:{" "}
              {requestsError.message || "Unknown error"}
            </div>
          ) : requests.length === 0 ? (
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
                    <small className="text-muted d-block">
                      {req.student} • {req.date} at {req.preferredTime} (
                      {req.duration} hr{req.duration > 1 ? "s" : ""})
                    </small>
                    <small className="text-muted d-block">
                      Notes: {req.note || "None"}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => setModal({ type: "accept", request: req })}
                      disabled={
                        acceptRequest.isLoading || declineRequest.isLoading
                      }
                    >
                      {acceptRequest.isLoading &&
                      acceptRequest.variables === req.id ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} className="me-1" />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() =>
                        setModal({ type: "decline", request: req })
                      }
                      disabled={
                        acceptRequest.isLoading || declineRequest.isLoading
                      }
                    >
                      {declineRequest.isLoading &&
                      declineRequest.variables === req.id ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="me-1" />
                          Decline
                        </>
                      )}
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
          {upcomingLoading ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : upcomingError ? (
            <div className="alert alert-danger">
              Failed to load upcoming sessions:{" "}
              {upcomingError.message || "Unknown error"}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-muted text-center">No upcoming sessions.</p>
          ) : (
            <div className="vstack gap-3">
              {upcoming.map((s) => {
                const start = new Date(`${s.date}T${s.startTime}`);
                const end = new Date(`${s.date}T${s.endTime}`);
                const isActive = currentTime >= start && currentTime <= end;
                return (
                  <div
                    key={s.id}
                    className="d-flex justify-content-between border rounded p-3"
                  >
                    <div>
                      <h6 className="fw-semibold mb-1">{s.subject}</h6>
                      <small className="text-muted d-block">
                        {s.date} • {s.startTime} to {s.endTime} with {s.student}
                      </small>
                      <small className="text-muted d-block">
                        Notes: {s.notes || "None"}
                      </small>
                      {s.completed && (
                        <small className="text-success d-block">
                          Completed
                        </small>
                      )}
                    </div>
                    {isActive ? (
                      <a
                        href={s.link}
                        target="_blank"
                        className="btn btn-sm btn-outline-primary"
                        disabled={s.completed}
                      >
                        {s.completed ? "Completed" : "Join"}
                      </a>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        disabled
                        title="You can only join when the session starts"
                      >
                        <Clock size={14} className="me-1" />
                        Join
                      </button>
                    )}
                  </div>
                );
              })}
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
          {pastLoading ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : pastError ? (
            <div className="alert alert-danger">
              Failed to load past sessions:{" "}
              {pastError.message || "Unknown error"}
            </div>
          ) : past.length === 0 ? (
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
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(request.id);
      }}
    >
      <p>
        Are you sure you want to accept this request for {request.subject} on{" "}
        {request.date} at {request.preferredTime}?
      </p>
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
        <label className="form-label">Reason for Declining (optional)</label>
        <textarea
          className="form-control"
          rows={3}
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
