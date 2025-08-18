import { useState, useMemo } from "react";
import { useCreateBooking } from "@/hooks/mutations";
import {
  useGetAllTutors,
  useGetSubjects,
  useGetWalletBalanceWithAccountNumber,
} from "@/hooks/queries";
import Spinner from "@/components/Spinner";

export default function BookTutorModal({
  isOpen,
  onClose,
  user,
  initialData = {},
}) {
  const createBooking = useCreateBooking();
  const { data: subjectsRes, isLoading: subjectsLoading } = useGetSubjects();
  const { data: allTutorsRes, isLoading: allTutorsLoading } = useGetAllTutors();
  const {
    data: walletData,
    isLoading: walletDataLoading,
    error: walletError,
  } = useGetWalletBalanceWithAccountNumber(user?.accountNo);

  const subjects = subjectsRes?.data?.data || [];
  const allTutors = allTutorsRes?.data?.data || [];
  const durationOptions = [60, 90, 120, 150];

  const [formData, setFormData] = useState({
    slotId: "",
    mentorId: initialData.mentorId || "",
    note: "",
    preferDate: "",
    preferTime: "",
    duration: "",
    subject: initialData.subject || "",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filter tutors based on selected subject
  const availableTutors = useMemo(() => {
    if (!formData.subject) return [];
    return allTutors.filter((tutor) =>
      tutor.competencySubjects.some((cs) => cs.subjectId === formData.subject)
    );
  }, [formData.subject, allTutors]);

  // Get available days for selected tutor
  const availableDays = useMemo(() => {
    const tutor = availableTutors.find((t) => t.id === formData.mentorId);
    if (!tutor) return [];
    return tutor.slots.map((slot) => slot.day);
  }, [formData.mentorId, availableTutors]);

  // Get available time slots for selected tutor, date, and duration
  const availableTimes = useMemo(() => {
    const tutor = availableTutors.find((t) => t.id === formData.mentorId);
    if (!tutor || !formData.preferDate || !formData.duration) return [];

    const day = new Date(formData.preferDate).toLocaleString("en-US", {
      weekday: "long",
    });
    const slot = tutor.slots.find((s) => s.day === day);
    if (!slot) return [];

    const duration = parseInt(formData.duration) || 60;
    const times = [];
    const start = new Date(`1970-01-01T${slot.startTime}Z`);
    const end = new Date(`1970-01-01T${slot.endTime}Z`);
    let current = new Date(start);

    while (current <= end) {
      const slotEnd = new Date(current.getTime() + duration * 60 * 1000);
      if (slotEnd <= end) {
        const hours = current.getUTCHours().toString().padStart(2, "0");
        const minutes = current.getUTCMinutes().toString().padStart(2, "0");
        times.push(`${hours}:${minutes}`);
      }
      current.setMinutes(current.getMinutes() + 30);
    }

    return times;
  }, [
    formData.mentorId,
    formData.preferDate,
    formData.duration,
    availableTutors,
  ]);

  // Calculate booking cost
  const bookingCost = useMemo(() => {
    const tutor = availableTutors.find((t) => t.id === formData.mentorId);
    if (!tutor || !formData.duration) return 0;
    return (
      parseFloat(tutor.ratePerHour) *
      (parseInt(formData.duration) / 60)
    ).toFixed(2);
  }, [formData.mentorId, formData.duration, availableTutors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset dependent fields when subject, mentor, or date changes
      if (name === "subject") {
        newData.mentorId = "";
        newData.preferDate = "";
        newData.preferTime = "";
        newData.slotId = "";
      } else if (name === "mentorId") {
        newData.preferDate = "";
        newData.preferTime = "";
        newData.slotId = "";
      } else if (name === "preferDate") {
        newData.preferTime = "";
        newData.slotId = "";
      }

      // Update slotId when date and time are selected
      if (name === "preferTime" && newData.preferDate && newData.mentorId) {
        const tutor = availableTutors.find((t) => t.id === newData.mentorId);
        const day = new Date(newData.preferDate).toLocaleString("en-US", {
          weekday: "long",
        });
        const slot = tutor?.slots.find((s) => s.day === day);
        newData.slotId = slot?.id || "";
      }

      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = () => {
    const [hours, minutes] = formData.preferTime.split(":");
    const preferDateTime = new Date(formData.preferDate);
    preferDateTime.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

    const payload = {
      slotId: formData.slotId,
      mentorId: formData.mentorId,
      note: formData.note,
      preferDate: preferDateTime.toISOString(),
      preferTime: formData.preferTime,
      duration: parseInt(formData.duration),
      subject: formData.subject,
    };
    createBooking.mutate(payload, {
      onSuccess: () => {
        setShowConfirmModal(false);
        onClose();
      },
      onError: (error) => {
        console.error("Booking error:", error);
      },
    });
  };

  if (!isOpen) return null;

  const selectedTutor = availableTutors.find((t) => t.id === formData.mentorId);

  return (
    <>
      <div
        className="modal show fade"
        style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Book a Tutor</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Subject</label>
                  <select
                    name="subject"
                    className="form-control"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    disabled={subjectsLoading || !!initialData.subject}
                  >
                    <option value="">
                      {subjectsLoading
                        ? "Loading subjects..."
                        : "Select a subject"}
                    </option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Tutor</label>
                  <select
                    name="mentorId"
                    className="form-control"
                    value={formData.mentorId}
                    onChange={handleChange}
                    required
                    disabled={
                      allTutorsLoading ||
                      !formData.subject ||
                      !!initialData.mentorId
                    }
                  >
                    <option value="">
                      {allTutorsLoading
                        ? "Loading tutors..."
                        : !formData.subject
                        ? "Select a subject first"
                        : "Select a tutor"}
                    </option>
                    {availableTutors.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.user.firstName} {tutor.user.lastName} (₦
                        {parseFloat(tutor.ratePerHour).toLocaleString()}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Preferred Date</label>
                  <input
                    type="date"
                    name="preferDate"
                    className="form-control"
                    value={formData.preferDate}
                    onChange={handleChange}
                    required
                    disabled={!formData.mentorId}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {formData.mentorId && availableDays.length > 0 && (
                    <small className="form-text text-muted">
                      Available days: {availableDays.join(", ")}
                    </small>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Duration (minutes)</label>
                  <select
                    name="duration"
                    className="form-control"
                    value={formData.duration}
                    onChange={handleChange}
                    required
                    disabled={!formData.mentorId}
                  >
                    <option value="">Select duration</option>
                    {durationOptions.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Preferred Time</label>
                  <select
                    name="preferTime"
                    className="form-control"
                    value={formData.preferTime}
                    onChange={handleChange}
                    required
                    disabled={
                      !formData.preferDate ||
                      !formData.duration ||
                      availableTimes.length === 0
                    }
                  >
                    <option value="">
                      {availableTimes.length === 0
                        ? "No available times"
                        : "Select a time"}
                    </option>
                    {availableTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Note</label>
                  <textarea
                    name="note"
                    className="form-control"
                    value={formData.note}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <input type="hidden" name="slotId" value={formData.slotId} />
              </div>

              <div className="modal-footer">
                <div className="w-100 mb-2">
                  {walletDataLoading ? (
                    <Spinner size="sm" />
                  ) : walletError ? (
                    <span className="text-danger">
                      Error loading wallet balance
                    </span>
                  ) : (
                    <span>
                      Wallet Balance: ₦
                      {parseFloat(
                        walletData?.balance || 0
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center"
                  disabled={
                    createBooking.isPending ||
                    !formData.slotId ||
                    !formData.mentorId ||
                    !formData.preferDate ||
                    !formData.preferTime ||
                    !formData.duration ||
                    !formData.subject
                  }
                >
                  {createBooking.isPending ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Booking...
                    </>
                  ) : (
                    "Book Now"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="modal show fade"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Booking</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to book this session?</p>
                <div className="mb-3">
                  <strong>Tutor:</strong>{" "}
                  {selectedTutor
                    ? `${selectedTutor.user.firstName} ${selectedTutor.user.lastName}`
                    : "Unknown Tutor"}
                </div>
                <div className="mb-3">
                  <strong>Date:</strong>{" "}
                  {new Date(formData.preferDate).toLocaleDateString()}
                </div>
                <div className="mb-3">
                  <strong>Time:</strong> {formData.preferTime}
                </div>
                <div className="mb-3">
                  <strong>Amount:</strong> ₦
                  {parseFloat(bookingCost).toLocaleString()}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={createBooking.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={handleConfirmBooking}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
