import { useState, useEffect } from "react";
import {
  CreditCard,
  DollarSign,
  ArrowDown,
  ArrowUp,
  Send,
  Download,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import TutorLayout from "@/components/layout/TutorLayout";
import { useAuthStore } from "@/store/zustand";
import {
  useGetWalletBalanceWithAccountNumber,
  useGetWalletTransactions,
} from "@/hooks/queries";
import Spinner from "@/components/Spinner";
import { useWithdrawEarningsRequest } from "@/hooks/mutations";

export default function TutorWalletPage() {
  const user = useAuthStore((state) => state.user);
  const {
    data: walletData,
    isLoading: loadingWallet,
    error: walletError,
  } = useGetWalletBalanceWithAccountNumber(user?.accountNo);
  const {
    data: transactionsData,
    isLoading: loadingTransactions,
    error: transactionsError,
  } = useGetWalletTransactions(user?.accountNo);
  const withdrawEarningsRequest = useWithdrawEarningsRequest(); // Imported but not used yet

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    accountName: walletData?.data?.customerName || "",
    accountNumber: "",
    bankName: "",
  });

  useEffect(() => {
    if (walletData?.data) {
      setWalletBalance(
        parseFloat(walletData.data.currentBalance || walletData.data.balance)
      );
    }
    if (walletError) {
      console.error("Wallet Error:", walletError);
      toast.error(walletError.message || "Failed to load wallet balance");
    }

    if (transactionsData?.data?.transactions) {
      console.log("Transactions Data:", transactionsData.data.transactions); // Debug log
      setTransactions(
        transactionsData.data.transactions.map((txn) => ({
          id: txn.id,
          type: parseFloat(txn.crAmount) > 0 ? "credit" : "debit",
          amount: parseFloat(txn.crAmount) || parseFloat(txn.drAmount) || 0,
          description: txn.narration,
          date: txn.transDate,
          transRef: txn.transRef,
        }))
      );
    }
    if (transactionsError) {
      console.error("Transactions Error:", transactionsError);
      toast.error(transactionsError.message || "Failed to load transactions");
    }
  }, [walletData, transactionsData, walletError, transactionsError]);

  const handleDownloadPDF = (tx) => {
    const latexContent = `
% Including a comprehensive preamble to ensure compatibility
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\usepackage{booktabs}

% Setting up header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\fhead{Transaction Details}
\\rfoot{Page \\thepage\\ of \\pageref{LastPage}}

% Defining colors
\\definecolor{headerblue}{RGB}{0, 51, 102}

% Customizing table
\\renewcommand{\\arraystretch}{1.2}

\\begin{document}

% Title section
\\begin{center}
    \\textbf{\\Large Transaction Receipt} \\
    \\vspace{0.2cm}
    \\textbf{Issued to: ${user?.firstName || "User"} ${user?.lastName || ""}} \\
    \\vspace{0.1cm}
    \\small \\today
\\end{center}

\\vspace{0.5cm}

% Transaction details table
\\begin{tabular}{ll}
    \\toprule
    \\rowcolor{headerblue!20}
    \\textbf{Field} & \\textbf{Details} \\
    \\midrule
    Transaction Number & ${tx.transNo} \\
    Date & ${new Date(tx.date).toLocaleString()} \\
    Description & ${tx.description} \\
    Amount & ₦${tx.amount.toLocaleString()} \\
    Type & ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} \\
    Status & ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)} \\
    \\bottomrule
\\end{tabular}

\\end{document}
`;
    console.log("Generating PDF with LaTeX content:", latexContent);
    toast.success("PDF download initiated for transaction " + tx.transNo);
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    const { amount, accountName, accountNumber, bankName } = withdrawForm;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      toast.error("Minimum withdrawal amount is ₦1,000");
      return;
    }
    if (parsedAmount > walletBalance) {
      toast.error("Insufficient balance");
      return;
    }
    if (!accountName.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error("Account number must be 10 digits");
      return;
    }
    if (!bankName) {
      toast.error("Bank is requried");
      return;
    }

    // Mock submission (endpoint not processed yet)
    const payload = {
      accountNo: user?.accountNo,
      amount: parsedAmount,
      bankDetails: {
        accountName,
        accountNumber,
        bankName,
      },
    };
    console.log("Withdrawal Payload (mock):", payload); // Debug log
    toast.success("Withdrawal request submitted (mock)");
    setWithdrawForm({
      amount: "",
      accountName: walletData?.data?.customerName || "",
      accountNumber: "",
      bankName: "",
    });
    setShowWithdrawModal(false);

    
    withdrawEarningsRequest.mutate(payload, {
      onSuccess: () => {
        setWithdrawForm({
          amount: "",
          accountName: walletData?.data?.customerName || "",
          accountNumber: "",
          bankName: "",
        });
        setShowWithdrawModal(false);
      },
    });
    
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setWithdrawForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <TutorLayout>
      <div className="mb-4">
        <h2 className="fw-bold">Wallet</h2>
        <p className="text-muted">Manage your balance and transactions</p>
      </div>

      {/* Wallet Summary */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          {loadingWallet ? (
            <div className="text-center">
              <Spinner />
            </div>
          ) : walletError ? (
            <div className="alert alert-danger">
              Failed to load balance: {walletError.message || "Unknown error"}
            </div>
          ) : (
            <div className="bg-light rounded shadow-sm p-4 d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted mb-1">Current Balance</p>
                <h4 className="fw-bold text-success">
                  ₦{walletBalance.toLocaleString()}
                </h4>
              </div>
              <DollarSign size={36} className="text-success" />
            </div>
          )}
        </div>

        <div className="col-md-6 d-flex align-items-center">
          <button
            className="btn btn-primary ms-auto"
            onClick={() => setShowWithdrawModal(true)}
            disabled={loadingWallet || walletError}
          >
            <Send className="me-2" size={16} />
            Request Withdrawal
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom">
          <h5 className="mb-0 fw-semibold">Transaction History</h5>
        </div>
        <div className="card-body p-0">
          {loadingTransactions ? (
            <div className="text-center p-4">
              <Spinner />
            </div>
          ) : transactionsError ? (
            <div className="alert alert-danger m-3">
              Failed to load transactions:{" "}
              {transactionsError.message || "Unknown error"}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted">No transactions found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount (₦)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>{format(parseISO(txn.date), "MMM d, yyyy")}</td>
                      <td>{txn.description}</td>
                      <td>
                        <span
                          className={`badge bg-${
                            txn.type === "credit" ? "success" : "danger"
                          }`}
                        >
                          {txn.type === "credit" ? (
                            <>
                              <ArrowDown size={12} className="me-1" />
                              Credit
                            </>
                          ) : (
                            <>
                              <ArrowUp size={12} className="me-1" />
                              Debit
                            </>
                          )}
                        </span>
                      </td>
                      <td>{txn.amount.toLocaleString()}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleDownloadPDF(txn)}
                        >
                          Download Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Request Withdrawal</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowWithdrawModal(false)}
                />
              </div>
              <form onSubmit={handleWithdraw}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    Note: Withdrawal processing is not yet available. This form
                    is for input purposes only.
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Amount (₦)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      className="form-control"
                      value={withdrawForm.amount}
                      onChange={handleFormChange}
                      placeholder="Enter amount to withdraw"
                      min="1000"
                    />
                    <small className="text-muted">
                      Minimum ₦1,000. Max: ₦{walletBalance.toLocaleString()}
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Account Name</label>
                    <input
                      type="text"
                      name="accountName"
                      required
                      className="form-control"
                      value={withdrawForm.accountName}
                      onChange={handleFormChange}
                      placeholder="Enter account name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      required
                      className="form-control"
                      value={withdrawForm.accountNumber}
                      onChange={handleFormChange}
                      placeholder="Enter 10-digit account number"
                      pattern="\d{10}"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text" 
                      name="bankName"
                      required
                      className="form-control"
                      value={withdrawForm.bankName}
                      onChange={handleFormChange}
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}