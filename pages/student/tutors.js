import { useState } from "react";
import { Search, Star, MapPin, BookOpen, Calendar } from "lucide-react";
import { useGetAllTutors } from "@/hooks/queries";
import StudentLayout from "@/components/layout/StudentLayout";
import BookTutorModal from "@/components/modals/bookSessionModal";
import { useAuthStore } from "@/store/zustand";

export default function FindTutorsPage() {
  const [search, setSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [modal, setModal] = useState(""); // 'view' | 'book' | ''
  const { data: tutorsData, isLoading: loadingTutors } = useGetAllTutors();
  const user = useAuthStore((state) => state.user);

  const tutors = tutorsData?.data?.data || [];

  const filteredTutors = tutors.filter((tutor) =>
    `${tutor.user.firstName} ${tutor.user.lastName} ${tutor.subject}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <StudentLayout>
      <div className="mb-4">
        <h2 className="fw-bold mb-2">Find a Tutor</h2>
        <p className="text-muted">Browse and book from top-rated tutors</p>
      </div>

      <div className="mb-4">
        <div className="input-group">
          <span className="input-group-text">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loadingTutors ? (
        <div>Loading tutors...</div>
      ) : (
        <div className="row g-4">
          {filteredTutors.map((tutor) => (
            <div className="col-md-6 col-lg-4" key={tutor.id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={tutor.profilePictureUrl || "/assets/img/profile.jpg"}
                      alt={`${tutor.user.firstName} ${tutor.user.lastName}`}
                      className="rounded-circle me-3"
                      width={50}
                      height={50}
                    />
                    <div>
                      <h6 className="fw-semibold mb-0">
                        {tutor.user.firstName} {tutor.user.lastName}
                      </h6>
                      <small className="text-muted">{tutor.subject}</small>
                    </div>
                  </div>
                  <p className="small text-muted flex-grow-1">
                    {tutor.bio || "No bio available"}
                  </p>

                  <div className="d-flex justify-content-between small text-muted mb-2">
                    <div>
                      <Star size={14} className="me-1 text-warning" />
                      {tutor.rating || "N/A"}
                    </div>
                    <div>
                      <BookOpen size={14} className="me-1" />
                      {tutor.experience || "N/A"}
                    </div>
                    <div>
                      <MapPin size={14} className="me-1" />
                      {tutor.location || "N/A"}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <strong>₦{tutor.ratePerHour}/hr</strong>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setSelectedTutor(tutor);
                          setModal("view");
                        }}
                      >
                        View Profile
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedTutor(tutor);
                          setModal("book");
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Profile Modal */}
      {modal === "view" && selectedTutor && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title">Tutor Profile</h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setModal("");
                    setSelectedTutor(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="text-center mb-4">
                  <img
                    src={
                      selectedTutor.profilePictureUrl ||
                      "/assets/img/profile.jpg"
                    }
                    alt={`${selectedTutor.user.firstName} ${selectedTutor.user.lastName}`}
                    className="rounded-circle mb-2"
                    width={60}
                    height={60}
                  />
                  <h6 className="fw-semibold mb-1">
                    {selectedTutor.user.firstName} {selectedTutor.user.lastName}
                  </h6>
                  <div className="small text-muted">
                    {selectedTutor.subject} • {selectedTutor.location || "N/A"}
                  </div>
                </div>
                <p className="text-muted small">
                  {selectedTutor.bio || "No bio available"}
                </p>
                <ul className="list-group list-group-flush small">
                  <li className="list-group-item">
                    <Star className="me-2 text-warning" size={16} />
                    Rating: {selectedTutor.rating || "N/A"}
                  </li>
                  <li className="list-group-item">
                    <BookOpen className="me-2 text-primary" size={16} />
                    Experience: {selectedTutor.experience || "N/A"}
                  </li>
                  <li className="list-group-item">
                    <Calendar className="me-2 text-success" size={16} />
                    Hourly Rate: ₦{selectedTutor.ratePerHour}
                  </li>
                  <li className="list-group-item">
                    <BookOpen className="me-2 text-info" size={16} />
                    Verified: {selectedTutor.isVerified ? "Yes" : "No"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Tutor Modal */}
      {modal === "book" && selectedTutor && (
        <BookTutorModal
          isOpen={modal === "book"}
          onClose={() => {
            setModal("");
            setSelectedTutor(null);
          }}
          initialData={{
            mentorId: selectedTutor.id,
            subject: selectedTutor.subject,
          }}
          user={user}
        />
      )}
    </StudentLayout>
  );
}
