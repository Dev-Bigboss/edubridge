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
  const durationOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4]; // Duration in hours

  const [currentStep, setCurrentStep] = useState(0);
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
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
  });


  const steps = [
    { title: "Subject", key: "subject" },
    { title: "Date", key: "date" },
    { title: "Duration & Time", key: "time" },
    { title: "Tutor", key: "tutor" },
    { title: "Note", key: "note" },
  ];

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    setCardDetails((prev) => ({ ...prev, [name]: value }));
  };


  // Get available days for tutors based on subject
  const availableDaysForSubject = useMemo(() => {
    if (!formData.subject) return [];

    const tutorsForSubject = allTutors.filter(
      (tutor) =>
        tutor.competencySubjects?.some(
          (cs) => cs.subjectId === formData.subject
        ) || false
    );

    const allDays = new Set();
    tutorsForSubject.forEach((tutor) => {
      if (tutor.slots && Array.isArray(tutor.slots)) {
        tutor.slots.forEach((slot) => {
          allDays.add(slot.day);
        });
      }
    });

    return Array.from(allDays);
  }, [formData.subject, allTutors]);

  // Get available times based on subject, date and duration
  const availableTimesForCriteria = useMemo(() => {
    if (!formData.subject || !formData.preferDate || !formData.duration)
      return [];

    const day = new Date(formData.preferDate).toLocaleString("en-US", {
      weekday: "long",
    });

    const tutorsForSubject = allTutors.filter(
      (tutor) =>
        tutor.competencySubjects?.some(
          (cs) => cs.subjectId === formData.subject
        ) || false
    );

    const allTimes = new Set();
    const duration = parseFloat(formData.duration) * 60; // Convert hours to minutes

    tutorsForSubject.forEach((tutor) => {
      if (!tutor.slots || !Array.isArray(tutor.slots)) return;

      const slot = tutor.slots.find((s) => s.day === day);
      if (!slot) return;

      const start = new Date(`1970-01-01T${slot.startTime}Z`);
      const end = new Date(`1970-01-01T${slot.endTime}Z`);
      let current = new Date(start);

      while (current <= end) {
        const slotEnd = new Date(current.getTime() + duration * 60 * 1000);
        if (slotEnd <= end) {
          const hours = current.getUTCHours().toString().padStart(2, "0");
          const minutes = current.getUTCMinutes().toString().padStart(2, "0");
          allTimes.add(`${hours}:${minutes}`);
        }
        current.setMinutes(current.getMinutes() + 30);
      }
    });

    return Array.from(allTimes).sort();
  }, [formData.subject, formData.preferDate, formData.duration, allTutors]);

  // Filter tutors based on all selected criteria
  const availableTutors = useMemo(() => {
    if (
      !formData.subject ||
      !formData.preferDate ||
      !formData.preferTime ||
      !formData.duration
    ) {
      return [];
    }

    const day = new Date(formData.preferDate).toLocaleString("en-US", {
      weekday: "long",
    });
    const duration = parseFloat(formData.duration) * 60; // Convert hours to minutes

    return allTutors.filter((tutor) => {
      // Check if tutor teaches the subject
      const hasSubject =
        tutor.competencySubjects?.some(
          (cs) => cs.subjectId === formData.subject
        ) || false;
      if (!hasSubject) return false;

      // Check if tutor has slots
      if (!tutor.slots || !Array.isArray(tutor.slots)) return false;

      // Check if tutor is available on the selected day
      const slot = tutor.slots.find((s) => s.day === day);
      if (!slot) return false;

      // Check if the selected time slot is available for this tutor
      const start = new Date(`1970-01-01T${slot.startTime}Z`);
      const end = new Date(`1970-01-01T${slot.endTime}Z`);
      const selectedTime = new Date(`1970-01-01T${formData.preferTime}:00Z`);
      const selectedEndTime = new Date(
        selectedTime.getTime() + duration * 60 * 1000
      );

      return selectedTime >= start && selectedEndTime <= end;
    });
  }, [
    formData.subject,
    formData.preferDate,
    formData.preferTime,
    formData.duration,
    allTutors,
  ]);

  // Calculate booking cost
  const bookingCost = useMemo(() => {
    const tutor = availableTutors.find((t) => t.id === formData.mentorId);
    if (!tutor || !formData.duration || !tutor.ratePerHour) return 0;
    return (
      parseFloat(tutor.ratePerHour) * parseFloat(formData.duration)
    ).toFixed(2);
  }, [formData.mentorId, formData.duration, availableTutors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Update slotId when mentor is selected
      if (name === "mentorId" && newData.preferDate && newData.preferTime) {
        const tutor = availableTutors.find((t) => t.id === value);
        const day = new Date(newData.preferDate).toLocaleString("en-US", {
          weekday: "long",
        });
        const slot = tutor?.slots.find((s) => s.day === day);
        newData.slotId = slot?.id || "";
      }

      return newData;
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
      duration: parseFloat(formData.duration),
      subject: formData.subject,
    };
    createBooking.mutate(payload, {
      onSuccess: () => {
        setShowConfirmModal(false);
        onClose();
        // Reset form and step
        setCurrentStep(0);
        setFormData({
          slotId: "",
          mentorId: "",
          note: "",
          preferDate: "",
          preferTime: "",
          duration: "",
          subject: "",
        });
      },
      onError: (error) => {
        console.error("Booking error:", error);
      },
    });
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Subject step
        return formData.subject;
      case 1: // Date step
        return formData.preferDate;
      case 2: // Time step
        return formData.preferTime && formData.duration;
      case 3: // Tutor step
        return formData.mentorId;
      case 4: // Note step
        return true;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  if (!isOpen) return null;

  const selectedTutor = availableTutors.find((t) => t.id === formData.mentorId);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Subject Selection
        return (
          <div className="mb-4">
            <label className="form-label fs-5 fw-bold">Select Subject</label>
            <select
              name="subject"
              className="form-control form-control-lg"
              value={formData.subject}
              onChange={handleChange}
              required
              disabled={subjectsLoading || !!initialData.subject}
            >
              <option value="">
                {subjectsLoading ? "Loading subjects..." : "Choose a subject"}
              </option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name || subject.id}
                </option>
              ))}
            </select>
          </div>
        );

      case 1: // Date Selection
        return (
          <div className="mb-4">
            <label className="form-label fs-5 fw-bold">Choose Date</label>
            <input
              type="date"
              name="preferDate"
              className="form-control form-control-lg"
              value={formData.preferDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split("T")[0]}
            />
            {availableDaysForSubject.length > 0 && (
              <small className="form-text text-muted mt-2">
                <strong>Available days:</strong>{" "}
                {availableDaysForSubject.join(", ")}
              </small>
            )}
          </div>
        );

      case 2: // Duration & Time Selection
        return (
          <div className="mb-4">
            <div className="mb-3">
              <label className="form-label fs-5 fw-bold">
                Select Duration (Hours)
              </label>
              <input
                type="number"
                name="duration"
                className="form-control form-control-lg"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 1, 1.5, 2"
                step="0.5"
                min="0.5"
                max="8"
                required
              />
              <small className="form-text text-muted">
                Enter duration in hours (e.g., 1 for 1 hour, 1.5 for 1 hour 30
                minutes)
              </small>
            </div>

            {formData.duration && (
              <div className="mb-3">
                <label className="form-label fs-5 fw-bold">Select Time</label>
                <input
                  type="time"
                  name="preferTime"
                  className="form-control form-control-lg"
                  value={formData.preferTime}
                  onChange={handleChange}
                  required
                />
                {availableTimesForCriteria.length > 0 && (
                  <small className="form-text text-muted mt-1">
                    <strong>Available time slots:</strong>{" "}
                    {availableTimesForCriteria.join(", ")}
                  </small>
                )}
                {availableTimesForCriteria.length === 0 &&
                  formData.duration && (
                    <small className="text-warning mt-1">
                      No tutors available for your selected criteria. Try
                      adjusting the date or duration.
                    </small>
                  )}
              </div>
            )}
          </div>
        );

      case 3: // Tutor Selection
        return (
          <div className="mb-4">
            <label className="form-label fs-5 fw-bold">Choose Your Tutor</label>
            {availableTutors.length === 0 ? (
              <div className="alert alert-warning">
                No tutors available for your selected criteria. Please go back
                and adjust your selections.
              </div>
            ) : (
              <select
                name="mentorId"
                className="form-control form-control-lg"
                value={formData.mentorId}
                onChange={handleChange}
                required
              >
                <option value="">Select a tutor</option>
                {availableTutors.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.user.firstName} {tutor.user.lastName}
                    {tutor.ratePerHour
                      ? ` - ₦${parseFloat(
                          tutor.ratePerHour
                        ).toLocaleString()}/hr`
                      : " - Rate not set"}
                  </option>
                ))}
              </select>
            )}

            {formData.mentorId && (
              <div className="mt-3 p-3 bg-light rounded">
                <h6>Booking Summary:</h6>
                <p className="mb-1">
                  <strong>Subject:</strong>{" "}
                  {subjects.find((s) => s.id === formData.subject)?.name ||
                    formData.subject}
                </p>
                <p className="mb-1">
                  <strong>Date:</strong>{" "}
                  {new Date(formData.preferDate).toLocaleDateString()}
                </p>
                <p className="mb-1">
                  <strong>Time:</strong> {formData.preferTime}
                </p>
                <p className="mb-1">
                  <strong>Duration:</strong> {formData.duration} hours
                </p>
                <p className="mb-0">
                  <strong>Cost:</strong> ₦
                  {parseFloat(bookingCost).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Note
        return (
          <div className="mb-4">
            <label className="form-label fs-5 fw-bold">
              Add a Note (Optional)
            </label>
            <textarea
              name="note"
              className="form-control"
              rows="4"
              value={formData.note}
              onChange={handleChange}
              placeholder="Any special requests or information for your tutor..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="modal show fade "
        style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="w-100">
                <h5 className="modal-title mb-3">Book a Tutor</h5>

                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    flexWrap: "nowrap",
                    overflow: "hidden",
                    width: "100%",
                    gap: "6px", // small gap between step items
                  }}
                >
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center"
                      style={{ flex: "1 1 0", minWidth: 0 }}
                    >
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center ${
                          index <= currentStep
                            ? "bg-primary text-white"
                            : "bg-light text-muted"
                        }`}
                        style={{
                          width: "24px",
                          height: "24px",
                          fontSize: "11px",
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </div>
                      <small
                        className={`ms-1 text-truncate ${
                          index <= currentStep
                            ? "text-primary fw-bold"
                            : "text-muted"
                        }`}
                        style={{ fontSize: "11px", maxWidth: "60px" }}
                      >
                        {step.title}
                      </small>
                      {index < steps.length - 1 && (
                        <div
                          className={`mx-1 ${
                            index < currentStep ? "bg-primary" : "bg-light"
                          }`}
                          style={{
                            height: "2px",
                            flexGrow: 1, // line stretches only within modal width
                            minWidth: "10px",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-close ms-3"
                onClick={onClose}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ minHeight: "300px" }}>
                <div className="text-center mb-4">
                  <h6 className="text-muted">
                    Step {currentStep + 1} of {steps.length}
                  </h6>
                </div>

                {renderStepContent()}

                {/* Hidden fields */}
                <input type="hidden" name="slotId" value={formData.slotId} />
              </div>

              <div className="modal-footer">
                <div className="d-flex justify-content-between w-100 align-items-center">
                  <div>
                    {walletDataLoading ? (
                      <Spinner size="sm" />
                    ) : walletError ? (
                      <span className="text-danger small">
                        Error loading wallet balance
                      </span>
                    ) : (
                      <span className="small text-muted">
                        Wallet Balance: ₦
                        {parseFloat(walletData?.balance || 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary me-2"
                      onClick={currentStep === 0 ? onClose : handlePrevious}
                    >
                      {currentStep === 0 ? "Cancel" : "Previous"}
                    </button>

                    {isLastStep ? (
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
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
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
                <p>Please confirm your booking details:</p>

                <div className="mb-3">
                  <strong>Subject:</strong>{" "}
                  {subjects.find((s) => s.id === formData.subject)?.name ||
                    formData.subject}
                </div>
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
                  <strong>Duration:</strong> {formData.duration} hours
                </div>
                <div className="mb-3">
                  <strong>Total Amount:</strong> ₦
                  {parseFloat(bookingCost).toLocaleString()}
                </div>

                {formData.note && (
                  <div className="mb-3">
                    <strong>Note:</strong> {formData.note}
                  </div>
                )}

                <hr />
                <h6>Enter Payment Details</h6>

                <div className="mb-3">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    name="cardNumber"
                    className="form-control"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.cardNumber}
                    onChange={handleCardChange}
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Expiry</label>
                    <input
                      type="text"
                      name="expiry"
                      className="form-control"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={handleCardChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">CVV</label>
                    <input
                      type="password"
                      name="cvv"
                      className="form-control"
                      placeholder="123"
                      value={cardDetails.cvv}
                      onChange={handleCardChange}
                      required
                    />
                  </div>
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
                  disabled={
                    createBooking.isPending ||
                    !cardDetails.cardNumber ||
                    !cardDetails.expiry ||
                    !cardDetails.cvv
                  }
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
