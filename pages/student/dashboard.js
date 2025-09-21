import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  Video,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  useGetStudentSummary,
  useGetStudentUpcomingSessions,
  useGetAllTutors,
} from "@/hooks/queries";
import StudentLayout from "@/components/layout/StudentLayout";
import BookTutorModal from "@/components/modals/bookSessionModal";
import SkeletonLoader from "@/components/skeletons/dashboard";
import { useAuthStore } from "@/store/zustand";

export default function StudentDashboard() {
  const [stats, setStats] = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = useAuthStore((state) => state.user);


  const { data: studentSummary, isLoading: loadingSummary } =
    useGetStudentSummary();
  const { data: upcomingSessions, isLoading: loadingUpcoming } =
    useGetStudentUpcomingSessions();
  const { data: tutorsData, isLoading: loadingTutors } = useGetAllTutors();

  const tutors = tutorsData?.data?.data || [];
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every 30 seconds (can be shorter if needed)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (studentSummary?.data) {
      setStats({
        tutors: studentSummary?.data?.activeTutor || 0,
        sessions: studentSummary?.data?.sessionBooked || 0,
        subjects: studentSummary?.data?.subjects || 0,
      });
    }

    if (upcomingSessions?.data?.data && tutors.length > 0) {
      setUpcoming(
        upcomingSessions.data.data.map((session) => {
          const tutor = tutors.find((t) => t.id === session.mentorId);
          return {
            id: session.id,
            subject: session.subject,
            tutor: session.mentor_name,
            link: session.zoom_join_link,
            time: session.startTime,
            date: session.session_date,
            endTime: session.endTime,
            avatar: tutor?.profilePictureUrl || "/assets/img/profile.jpg",
            mode: session.type || "Online",
          };
        })
      );
    }
  }, [studentSummary, upcomingSessions, tutors]);

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Welcome back 👋</h2>
        <p className="text-muted mb-0">Here’s your learning overview.</p>
      </div>

      {/* Stats Cards */}
      {loadingSummary ? (
        <SkeletonLoader type="stats" />
      ) : (
        <div className="row g-3 mb-5">
          <div className="col-md-3 col-sm-6">
            <div className="bg-primary bg-opacity-10 rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="fw-bold mb-0 text-primary">{stats.tutors}</h5>
                  <small className="text-muted">Active Tutors</small>
                </div>
                <Users className="text-primary" size={24} />
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="bg-success bg-opacity-10 rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="fw-bold mb-0 text-success">
                    {stats.sessions}
                  </h5>
                  <small className="text-muted">Sessions Booked</small>
                </div>
                <Calendar className="text-success" size={24} />
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="bg-info bg-opacity-10 rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="fw-bold mb-0 text-info">{stats.subjects}</h5>
                  <small className="text-muted">Subjects</small>
                </div>
                <BookOpen className="text-info" size={24} />
              </div>
            </div>
          </div>
         
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="row g-4 mb-5">
        <div className="col-lg-12">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="fw-semibold mb-0">📅 Upcoming Sessions</h5>
            </div>
            <div className="card-body">
              {loadingUpcoming || loadingTutors ? (
                <SkeletonLoader type="session" count={2} />
              ) : upcoming.length === 0 ? (
                <p className="text-muted text-center">
                  No sessions scheduled yet.
                </p>
              ) : (
                <div className="vstack gap-3">
                  {upcoming.map((s) => {
                    const start = new Date(`${s.date}T${s.time}`);
                    const end = new Date(`${s.date}T${s.endTime}`);

                    const isActive = currentTime >= start && currentTime <= end;

                    return (
                      <div
                        key={s.id}
                        className="d-flex align-items-center justify-content-between border rounded p-3"
                      >
                        <div className="d-flex align-items-center">
                          <img
                            src={s.avatar}
                            alt={s.tutor}
                            className="rounded-circle me-3"
                            width={42}
                            height={42}
                          />
                          <div>
                            <h6 className="fw-semibold mb-1">{s.subject}</h6>
                            <small className="text-muted">
                              From {s.time} to {s.endTime} on{" "}
                              {new Date(`${s.date}T00:00:00`).toDateString()}{" "}
                              with {s.tutor}
                            </small>
                          </div>
                        </div>

                        {isActive ? (
                          <a
                            href={s.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <button className="btn btn-sm btn-outline-primary">
                              <Video size={14} className="me-1" />
                              Join
                            </button>
                          </a>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                            title="You can only join when the session starts"
                          >
                            <Video size={14} className="me-1" />
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
        </div>
      </div>

      {/* CTA Section */}
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center p-4">
          <h5 className="fw-bold mb-2">Need help with a new topic?</h5>
          <p className="text-muted mb-3">
            Explore tutors available in your subjects of interest.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <ArrowRight size={16} className="me-1" />
            Book a Tutor
          </button>
        </div>
      </div>

      <BookTutorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </StudentLayout>
  );
}
