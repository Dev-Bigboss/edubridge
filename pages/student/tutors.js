import StudentLayout from "@/components/layout/StudentLayout";
import { useState } from "react";
import {
  Search,
  Star,
  MapPin,
  BookOpen,
  X,
  Calendar,
  Send,
} from "lucide-react";

const tutors = [
  {
    id: 1,
    name: "Mr. Tunde Adebayo",
    subject: "Mathematics",
    location: "Lagos, Nigeria",
    rating: 4.9,
    experience: "5 years",
    hourlyRate: 3000,
    avatar: "/assets/img/profile.jpg",
    bio: "Experienced math tutor with a passion for helping students excel in algebra and calculus.",
  },
  {
    id: 2,
    name: "Ms. Aisha Bello",
    subject: "Biology",
    location: "Abuja, Nigeria",
    rating: 4.7,
    experience: "3 years",
    hourlyRate: 2500,
    avatar: "/assets/img/profile.jpg",
    bio: "Specialist in WAEC/NECO Biology tutoring with a focus on practical examples.",
  },
];

export default function FindTutorsPage() {
  const [search, setSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [modal, setModal] = useState(""); // 'view' | 'book' | ''

  const filteredTutors = tutors.filter((tutor) =>
    tutor.name.toLowerCase().includes(search.toLowerCase())
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

      <div className="row g-4">
        {filteredTutors.map((tutor) => (
          <div className="col-md-6 col-lg-4" key={tutor.id}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-center mb-3">
                  <img
                    src={tutor.avatar}
                    alt={tutor.name}
                    className="rounded-circle me-3"
                    width={50}
                    height={50}
                  />
                  <div>
                    <h6 className="fw-semibold mb-0">{tutor.name}</h6>
                    <small className="text-muted">{tutor.subject}</small>
                  </div>
                </div>
                <p className="small text-muted flex-grow-1">{tutor.bio}</p>

                <div className="d-flex justify-content-between small text-muted mb-2">
                  <div>
                    <Star size={14} className="me-1 text-warning" />
                    {tutor.rating}
                  </div>
                  <div>
                    <BookOpen size={14} className="me-1" />
                    {tutor.experience}
                  </div>
                  <div>
                    <MapPin size={14} className="me-1" />
                    {tutor.location}
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-2">
                  <strong>₦{tutor.hourlyRate}/hr</strong>
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

      {/* MODALS */}
      {modal && selectedTutor && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title">
                  {modal === "view"
                    ? "Tutor Profile"
                    : `Book ${selectedTutor.name}`}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setModal("");
                    setSelectedTutor(null);
                  }}
                />
              </div>
              <div className="modal-body">
                {modal === "view" && (
                  <div>
                    <div className="text-center mb-4">
                      <img
                        src={selectedTutor.avatar}
                        alt={selectedTutor.name}
                        className="rounded-circle mb-2"
                        width={60}
                        height={60}
                      />
                      <h6 className="fw-semibold mb-1">{selectedTutor.name}</h6>
                      <div className="small text-muted">
                        {selectedTutor.subject} • {selectedTutor.location}
                      </div>
                    </div>
                    <p className="text-muted small">{selectedTutor.bio}</p>
                    <ul className="list-group list-group-flush small">
                      <li className="list-group-item">
                        <Star className="me-2 text-warning" size={16} />
                        Rating: {selectedTutor.rating}
                      </li>
                      <li className="list-group-item">
                        <BookOpen className="me-2 text-primary" size={16} />
                        Experience: {selectedTutor.experience}
                      </li>
                      <li className="list-group-item">
                        <Calendar className="me-2 text-success" size={16} />
                        Hourly Rate: ₦{selectedTutor.hourlyRate}
                      </li>
                    </ul>
                  </div>
                )}

                {modal === "book" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      alert(
                        `Booking sent to ${selectedTutor.name} (mock behavior)`
                      );
                      setModal("");
                      setSelectedTutor(null);
                    }}
                  >
                    <div className="mb-3">
                      <label className="form-label">
                        Preferred Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        className="form-control"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-control"
                        placeholder="Write a short note to the tutor..."
                        rows={3}
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setModal("");
                          setSelectedTutor(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <Send size={16} className="me-2" />
                        Send Booking
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
