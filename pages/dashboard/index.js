import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  Star,
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import TutorLayout from "@/components/layout/TutorLayout";
import {
  useGetTutorSummary,
  useGetTutorUpcomingSessions,
  useGetClassRequestsMentor,
  useGetWalletBalanceWithAccountNumber
} from "@/hooks/queries";
import {
  useAcceptClassRequest,
  useRejectClassRequest,
} from "@/hooks/mutations";
import { useAuthStore } from "@/store/zustand";
import SkeletonLoader from "@/components/skeletons/dashboard";
import Spinner from "@/components/Spinner";


const StatCard = ({ icon, label, value, color }) => (
  <div className="col-md-3 col-sm-6">
    <div className="card border-0 shadow-sm h-100 stat-card">
      <div className="card-body text-center">
        <div
          className={`bg-${color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`}
          style={{ width: "60px", height: "60px" }}
        >
          {icon}
        </div>
        <h4 className="fw-bold mb-1">{value}</h4>
        <p className="text-muted mb-2">{label}</p>
      </div>
    </div>
  </div>
);

export default function TutorDashboard() {
  const user = useAuthStore((state) => state.user);
  // const queryClient = useQueryClient();
  const { data: summary, isLoading: summaryLoading } = useGetTutorSummary();
  const { data: upcoming, isLoading: upcomingLoading } =
    useGetTutorUpcomingSessions();
  const { data: classRequests, isLoading: classRequestsLoading } =
    useGetClassRequestsMentor(user?.id);
  const {
      data: walletData,
      isLoading: loadingWallet,
      error: walletError,
    } = useGetWalletBalanceWithAccountNumber(user?.accountNo);
  const acceptRequest = useAcceptClassRequest();
  const declineRequest = useRejectClassRequest();
    const [showDeclineModal, setShowDeclineModal] = useState(null);


  const [stats, setStats] = useState({
    activeStudents: 0,
    totalHours: 0,
    rating: 0,
    completedSessions: 0,
    walletBalance: 0,
  });
  const [classesToday, setClassesToday] = useState([]);
  const [requests, setRequests] = useState([]);
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  useEffect(() => {
    if (summary?.data && walletData?.data) {
      setStats({
        activeStudents: summary.data.activeStudent || 0,
        totalHours: summary.data.totalHours || 0,
        rating: summary.data.averageRating || 0,
        completedSessions: summary.data.completedSession || 0,
        walletBalance: walletData?.data?.currentBalance || parseFloat(walletData?.data?.balance), // Assumes API provides this
      });
    }

   if (upcoming?.data?.data) {
     console.log("Upcoming Sessions Data:", upcoming.data.data); // Debug log
     setClassesToday(
       upcoming.data.data
         .filter((s) => isToday(parseISO(s.session_date))) // Filter for today
         .map((s) => ({
           id: s.id,
           subject: s.session_subject,
           startTime: format(parseISO(`2025-08-16T${s.startTime}`), "h:mm a"), // Format time (e.g., "8:30 AM")
           date: s.session_date,
           student: s.mentee_name,
           link: s.zoom_start_link,
           notes: s.notes,
           duration: s.booking.duration,
           completed: s.completed,
         }))
     );
   }

    if (classRequests?.data) {
      setRequests(
        classRequests.data.map((req) => ({
          id: req.id,
          menteeId: req.mentee.id,
          subject: req.mentor.subject,
          date: req.prefer_date,
          preferredTime: req.prefer_time,
          duration: req.duration,
          note: req.note,
          hourlyRate: req.mentor.ratePerHour,
        }))
      );
    }
  }, [summary, upcoming, classRequests]);

  const handleAcceptRequest = (id) => {
    acceptRequest.mutate(id);
  };


  const handleDeclineRequest = (id) => {
    setShowDeclineModal(id);
  };

  const confirmDecline = () => {
    declineRequest.mutate(showDeclineModal,
      {
        onSuccess: () => {
          setShowDeclineModal(null);
        },
      }
    );
  };
  return (
    <TutorLayout>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Welcome back, {user.firstName || "tutor"} 👋
          </h2>
          <p className="text-muted">Here's what's happening today.</p>
        </div>
      </div>

      {/* Quick Stats */}
      {summaryLoading ? (
        <SkeletonLoader type="stats" />
      ) : (
        <div className="row g-4 mb-4">
          <StatCard
            icon={<Users className="text-primary" size={24} />}
            label="Active Students"
            value={stats.activeStudents}
            color="primary"
          />
          <StatCard
            icon={<Clock className="text-success" size={24} />}
            label="Total Hours"
            value={stats.totalHours}
            color="success"
          />
          <StatCard
            icon={<Star className="text-warning" size={24} />}
            label="Average Rating"
            value={stats.rating}
            color="warning"
          />
          <StatCard
            icon={<Target className="text-info" size={24} />}
            label="Completed Sessions"
            value={stats.completedSessions}
            color="info"
          />
          <StatCard
            icon={<DollarSign className="text-secondary" size={24} />}
            label="Wallet Balance (₦)"
            value={stats.walletBalance.toLocaleString()}
            color="secondary"
          />
        </div>
      )}

      {/* Schedule */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          {upcomingLoading ? (
            <SkeletonLoader type="session" count={2} />
          ) : (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent">
                <h5 className="mb-0 fw-semibold">📆 Today's Schedule</h5>
              </div>
              <div className="card-body">
                {classesToday.length === 0 ? (
                  <p className="text-muted">No classes scheduled for today.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {classesToday.map((c) => (
                      <li
                        key={c.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <h6 className="mb-1 fw-semibold">{c.subject}</h6>
                          <small className="text-muted">
                            {c.time} • {c.student}
                          </small>
                        </div>
                        <a
                          href={c.link}
                          target="_blank"
                          className="btn btn-sm btn-outline-primary"
                        >
                          Join
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Class Requests */}
      {classRequestsLoading ? (
        <SkeletonLoader type="requests" count={2} />
      ) : (
        <div className="card border-0 shadow-sm mb-5">
          <div className="card-header bg-transparent">
            <h5 className="mb-0 fw-semibold">📝 Class Requests</h5>
          </div>
          <div className="card-body">
            {requests.length === 0 ? (
              <p className="text-muted">No pending requests.</p>
            ) : (
              <div className="row g-3">
                {requests.map((r) => (
                  <div className="col-md-6" key={r.id}>
                    <div className="p-3 border rounded h-100">
                      <h6 className="fw-bold mb-1">{r.subject}</h6>
                      <small className="text-muted d-block mb-2">
                        Student ID: {r.menteeId}
                      </small>
                      <p className="small text-muted mb-2">
                        {r.note || "No note provided"}
                      </p>
                      <div className="d-flex justify-content-between mb-3">
                        <small className="text-muted">
                          Rate: ₦{parseFloat(r.hourlyRate).toLocaleString()}/hr
                        </small>
                        <small className="text-muted">
                          {new Date(r.date).toLocaleDateString()} at{" "}
                          {r.preferredTime} ({r.duration} hr
                          {r.duration > 1 ? "s" : ""})
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-success d-flex align-items-center"
                          onClick={() => handleAcceptRequest(r.id)}
                          disabled={
                            acceptRequest.isLoading || declineRequest.isLoading
                          }
                        >
                          {acceptRequest.isLoading &&
                          acceptRequest.variables?.bookingId === r.id ? (
                            <>
                              <Spinner size="sm" className="me-1" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="me-1" />
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger d-flex align-items-center"
                          onClick={() => handleDeclineRequest(r.id)}
                          disabled={
                            acceptRequest.isLoading || declineRequest.isLoading
                          }
                        >
                          {declineRequest.isLoading &&
                          declineRequest.variables?.bookingId === r.id ? (
                            <>
                              <Spinner size="sm" className="me-1" />
                              Declining...
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="me-1" />
                              Decline
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showDeclineModal && (
        <div
          className="modal show fade"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Decline</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeclineModal(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to decline this class request?</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowDeclineModal(null)}
                  disabled={declineRequest.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-flex align-items-center"
                  onClick={confirmDecline}
                  disabled={declineRequest.isLoading}
                >
                  {declineRequest.isLoading &&
                  declineRequest.variables?.bookingId === showDeclineModal ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Declining...
                    </>
                  ) : (
                    <>
                      <XCircle size={14} className="me-1" />
                      Decline
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Styling */}
      <style jsx>{`
        .stat-card:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
      `}</style>
    </TutorLayout>
  );
}
