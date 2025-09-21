import { useState, useEffect } from "react";
import {
  CreditCard,
  Shield,
  Trash2,
  Edit3,
} from "lucide-react";
import {
 
  useGetStoredCard,
} from "@/hooks/queries";
import {  useStoreCard, useDeleteCard } from "@/hooks/mutations";
import { useAuthStore } from "@/store/zustand";
import StudentLayout from "@/components/layout/StudentLayout";
import SkeletonLoader from "@/components/skeletons/dashboard";
import queryClient from "@/lib/queryClient";
import Spinner from "@/components/Spinner";

export default function StudentWallet() {
  const user = useAuthStore((state) => state.user);
  // // const { data: walletData, isLoading: loadingWallet } =
  //   useGetWalletBalanceWithAccountNumber(user?.accountNo);
  // const { data: transactionsData, isLoading: loadingTransactions } =
  //   useGetWalletTransactions(user?.accountNo);
  // const { data: storedCardData, isLoading: loadingCard } = useGetStoredCard(
  //   user?.id
  // );

  const storeCard = {
    cardNumber: "1234 5678 9012 3456",
    expiryMonth: "12",
    expiryYear: "25",
  };

  const loadingWallet = false;
  const loadingCard = false;
  const storedCardData = storeCard;
  

 

  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [storedCard, setStoredCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [amount, setAmount] = useState("");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardholderName: "",
  });

  useEffect(() => {

    if (storedCardData) {
      setStoredCard(storedCardData);
    }
  }, [ storedCardData]);

  const handleCardSubmit = (e) => {
    e.preventDefault();
    const payload = {
      userId: user?.id,
      cardNumber: cardDetails.cardNumber.replace(/\s/g, ""),
      expiryMonth: cardDetails.expiryMonth,
      expiryYear: cardDetails.expiryYear,
      cvv: cardDetails.cvv,
      cardholderName: cardDetails.cardholderName,
    };

    storeCard.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries(["storedCard", user?.id]);
        setCardDetails({
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
          cardholderName: "",
        });
        setShowCardModal(false);
        alert("Card saved successfully!");
      },
      onError: (error) => {
        alert(`Failed to save card: ${error.message}`);
      },
    });
  };




  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "cardNumber") {
      setCardDetails((prev) => ({
        ...prev,
        [name]: formatCardNumber(value),
      }));
    } else {
      setCardDetails((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };


  const maskCardNumber = (cardNumber) => {
    if (!cardNumber) return "";
    const cleaned = cardNumber.replace(/\s/g, "");
    return "**** **** **** " + cleaned.slice(-4);
  };

  return (
    <StudentLayout>
      <div className="mb-4">
        <h3 className="fw-bold">My Wallet</h3>
        <p className="text-muted">
          Add your debit card to ease process of booking sessions
        </p>
      </div>

      {/* Balance Card and Stored Card Info */}
      {loadingWallet || loadingCard ? (
        <SkeletonLoader type="wallet" count={3} />
      ) : (
        <>
          <div className="row mb-4">
         

            <div className="col-md-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-muted mb-0">Payment Method</h6>
                    {storedCard && (
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-outline-secondary dropdown-toggle"
                          data-bs-toggle="dropdown"
                        >
                          <Edit3 size={14} />
                        </button>
                        <ul className="dropdown-menu">
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => setShowCardModal(true)}
                            >
                              <Edit3 size={14} className="me-2" />
                              Update Card
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item text-danger"
                              // disabled={deleteCard.isPending}
                            >
                              <Trash2 size={14} className="me-2" />
                              Remove Card
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {storedCard ? (
                    <div className="d-flex align-items-center">
                      <CreditCard className="text-primary me-2" size={20} />
                      <div>
                        <div className="fw-bold small">
                          {maskCardNumber(storedCard.cardNumber)}
                        </div>
                        <div className="text-muted small">
                          Expires {storedCard.expiryMonth}/
                          {storedCard.expiryYear}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline-primary btn-sm w-100"
                      onClick={() => setShowCardModal(true)}
                    >
                      <CreditCard className="me-2" size={16} />
                      Add Debit Card
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

       
        </>
      )}

      {/* Add/Update Card Modal */}
      {showCardModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">
                  <Shield className="me-2" size={20} />
                  {storedCard ? "Update" : "Add"} Debit Card
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCardModal(false)}
                />
              </div>
              <form onSubmit={handleCardSubmit}>
                <div className="modal-body">
                  <div className="alert alert-info small">
                    <Shield size={16} className="me-2" />
                    Your card details are encrypted and stored securely.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="cardholderName"
                      value={cardDetails.cardholderName}
                      onChange={handleCardInputChange}
                      required
                      placeholder="Enter name on card"
                      disabled={storeCard.isPending}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="cardNumber"
                      value={cardDetails.cardNumber}
                      onChange={handleCardInputChange}
                      required
                      maxLength="19"
                      placeholder="1234 5678 9012 3456"
                      disabled={storeCard.isPending}
                    />
                  </div>

                  <div className="row mb-3">
                    <div className="col-4">
                      <label className="form-label fw-semibold">Month</label>
                      <select
                        className="form-control"
                        name="expiryMonth"
                        value={cardDetails.expiryMonth}
                        onChange={handleCardInputChange}
                        required
                        disabled={storeCard.isPending}
                      >
                        <option value="">MM</option>
                        {[...Array(12)].map((_, i) => (
                          <option
                            key={i + 1}
                            value={String(i + 1).padStart(2, "0")}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold">Year</label>
                      <select
                        className="form-control"
                        name="expiryYear"
                        value={cardDetails.expiryYear}
                        onChange={handleCardInputChange}
                        required
                        disabled={storeCard.isPending}
                      >
                        <option value="">YY</option>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() + i;
                          return (
                            <option key={year} value={String(year).slice(-2)}>
                              {String(year).slice(-2)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold">CVV</label>
                      <input
                        type="text"
                        className="form-control"
                        name="cvv"
                        value={cardDetails.cvv}
                        onChange={handleCardInputChange}
                        required
                        maxLength="4"
                        placeholder="123"
                        disabled={storeCard.isPending}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCardModal(false)}
                    disabled={storeCard.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                    disabled={storeCard.isPending}
                  >
                    {storeCard.isPending ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Shield className="me-2" size={16} />
                        Save Card
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

 

      
    </StudentLayout>
  );
}
