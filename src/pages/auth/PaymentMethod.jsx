import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import { getMemberPayments, simulatePaymentSuccess } from "../../services/memberService";

// "Select Payment Method" — reached from the "Proceed to Payment" button on the
// payment-pending summary (RegistrationStatus). The member is carried in via
// router state ({ member, email }); opening the route directly with no state
// sends the user back to login.
//
// The user picks a method and clicks "Continue to Payment", which runs the
// (test) payment via POST /api/payment/simulate-success/{id} and, on success,
// returns to the status page where the workflow now shows the payment complete.

const buildName = (initials, denoted, lastname) => {
  const lead = String(initials || denoted || "").trim();
  const tail = String(lastname || "").trim();
  return [lead, tail].filter(Boolean).join(" ") || "—";
};

// Selectable payment methods. The test gateway ignores the choice, so these are
// purely the UI options the user picks between.
const METHODS = [
  {
    id: "card",
    label: "Credit / Debit Card",
    desc: "Visa, Mastercard, Amex",
    icon: "M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  },
  {
    id: "online_banking",
    label: "Online Banking",
    desc: "Pay directly from your bank account",
    icon: "M3 21h18M4 18h16M5 18V9m4 9V9m6 9V9m4 9V9M3 9l9-6 9 6",
  },
  {
    id: "mobile_wallet",
    label: "Mobile Wallet",
    desc: "eZ Cash · mCash · Genie",
    icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
];

export default function PaymentMethod() {
  const navigate = useNavigate();
  const location = useLocation();

  const member = location.state?.member || null;
  const email = location.state?.email || member?.email || "";

  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // No member in state (e.g. page opened directly) → back to login.
  useEffect(() => {
    if (!member) navigate("/login", { replace: true });
  }, [member, navigate]);

  // Pull the amount due from the member's pending payment so the page can show
  // exactly what they're about to pay.
  useEffect(() => {
    if (!member?.id) return;
    let on = true;
    getMemberPayments(member.id)
      .then((payments) => {
        if (!on) return;
        const pending =
          payments.find((p) => !String(p.payment_status || "").toLowerCase().includes("complete")) ||
          payments[0];
        if (pending?.amount != null) setAmount(Number(pending.amount));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [member]);

  const name = useMemo(
    () => buildName(member?.initials, member?.name_denoted_by_initials, member?.lastname),
    [member]
  );

  const amountLabel =
    amount != null ? `LKR ${amount.toLocaleString()}` : "Registration Fee";

  const handleContinue = async () => {
    if (!selected || paying) return;
    setError("");
    setPaying(true);
    try {
      await simulatePaymentSuccess(member.id);
      // Payment recorded — return to the status page, which re-fetches the
      // member and now shows the Payment step complete.
      navigate("/registration-status", {
        replace: true,
        state: { member, email },
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "We couldn't complete your payment. Please try again."
      );
      setPaying(false);
    }
  };

  if (!member) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 m-0 px-4 sm:px-8 lg:px-12 py-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Branding header (matches the login / status pages) */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="USJ Logo" className="w-14 h-14 object-contain flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">University of Sri Jayewardenepura</p>
            <p className="text-xs text-blue-600">Sports Facility Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-lg font-bold text-gray-900">Select Payment Method</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Choose how you'd like to pay your registration fee.
          </p>

          {/* Amount summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-blue-50 rounded-xl px-4 py-3 mt-4 gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Paying as</p>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {name} <span className="font-normal text-gray-500">· {member.member_id || email}</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-xs text-gray-500">Amount due</p>
              <p className="text-base font-bold text-blue-700">{amountLabel}</p>
            </div>
          </div>

          {/* Method options */}
          <div className="space-y-3 mt-5">
            {METHODS.map((m) => {
              const active = selected === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelected(m.id)}
                  className={`w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3 transition ${
                    active
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={m.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                  {/* Radio indicator */}
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      active ? "border-blue-600" : "border-gray-300"
                    }`}
                  >
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </span>
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

          <button
            onClick={handleContinue}
            disabled={!selected || paying}
            className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm mt-5 transition shadow-sm hover:shadow-md"
          >
            {paying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Processing payment…
              </span>
            ) : !selected ? "Select a method above to continue" : "Continue to Payment →"}
          </button>
          <button
            onClick={() => navigate(-1)}
            disabled={paying}
            className="w-full text-sm text-gray-500 hover:text-blue-600 transition mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-8">
          © {new Date().getFullYear()} University of Sri Jayewardenepura
        </p>
      </div>
    </div>
  );
}
