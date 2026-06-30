import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMemberPayments, simulatePaymentSuccess } from "../../services/memberService";
import { getClubPayments, simulateClubPaymentSuccess } from "../../services/coachService";

// "Select Payment Method" — reached from the "Proceed to Payment" button on the
// payment-pending summary (RegistrationStatus). The member is carried in via
// router state ({ member, email }); opening the route directly with no state
// sends the user back to login.
//
// Rendered as a centered confirmation dialog over a blurred overlay. A single
// payment method (Visa Credit/Debit Card) is pre-selected; the user confirms
// with "Proceed to Payment", which runs the (test) payment via
// POST /api/payment/simulate-success/{id} and, on success, returns to the
// status page where the workflow now shows the payment complete.

const buildName = (initials, denoted, lastname) => {
  const lead = String(initials || denoted || "").trim();
  const tail = String(lastname || "").trim();
  return [lead, tail].filter(Boolean).join(" ") || "—";
};

// Visa wordmark rendered inline (no external asset / network request) so the
// card badge matches the brand without loading an image.
const VisaMark = () => (
  <span
    className="select-none font-bold italic tracking-tight text-[15px] leading-none"
    style={{ color: "#1a1f71" }}
  >
    VISA
  </span>
);

export default function PaymentMethod({
  member: memberProp,
  club: clubProp,
  email: emailProp,
  onClose,
  onSuccess,
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Two modes:
  //  • Modal — rendered on top of another page (e.g. RegistrationStatus or the
  //    registration "submitted" popups) with a `member` OR a `club` plus
  //    `onClose`/`onSuccess` callbacks.
  //  • Route — opened standalone at /payment-method, reading router state and
  //    navigating on close/success. (kept for backward compatibility; member only)
  const isModal = Boolean(memberProp || clubProp);
  const member = memberProp || location.state?.member || null;
  const club = clubProp || null;
  // Club registration pays a club-level fee; everything else is a member fee.
  const isClub = Boolean(club);
  const payeeId = member?.id ?? club?.id ?? null;
  const email = emailProp || location.state?.email || member?.email || "";

  // Only one method is offered and it is selected by default.
  const [selected] = useState("card");
  const [amount, setAmount] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // Route mode only: page opened directly with no payee → back to login.
  useEffect(() => {
    if (!isModal && !member) navigate("/login", { replace: true });
  }, [isModal, member, navigate]);

  // Pull the amount due from the pending payment (member- or club-level) so the
  // page can show exactly what they're about to pay.
  useEffect(() => {
    if (!payeeId) return;
    let on = true;
    const fetchPayments = isClub ? getClubPayments(payeeId) : getMemberPayments(payeeId);
    Promise.resolve(fetchPayments)
      .then((payments) => {
        if (!on) return;
        const list = Array.isArray(payments) ? payments : [];
        const pending =
          list.find((p) => !String(p.payment_status || "").toLowerCase().includes("complete")) ||
          list[0];
        if (pending?.amount != null) setAmount(Number(pending.amount));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [payeeId, isClub]);

  const name = useMemo(
    () =>
      isClub
        ? club?.club_name || "Your Club"
        : buildName(member?.initials, member?.name_denoted_by_initials, member?.lastname),
    [isClub, club, member]
  );

  const amountLabel =
    amount != null ? `LKR ${amount.toLocaleString()}` : "Registration Fee";

  const handleContinue = async () => {
    if (!selected || paying) return;
    setError("");
    setPaying(true);
    try {
      if (isClub) await simulateClubPaymentSuccess(payeeId);
      else await simulatePaymentSuccess(payeeId);
      // Payment recorded.
      if (isModal) {
        // Let the host page refresh the member so the workflow shows paid,
        // then dismiss the dialog.
        onSuccess?.();
        onClose?.();
      } else {
        // Standalone route — return to the status page, which re-fetches the
        // member and now shows the Payment step complete.
        navigate("/registration-status", {
          replace: true,
          state: { member, email },
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "We couldn't complete your payment. Please try again."
      );
      setPaying(false);
    }
  };

  if (!member && !club) return null;

  const handleCancel = () => {
    if (paying) return;
    if (isModal) onClose?.();
    else navigate(-1);
  };

  return (
    // Blurred, dimmed overlay covering the viewport with the dialog centered.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-dialog-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-7"
      >
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <h1 id="pay-dialog-title" className="text-lg font-bold text-gray-900">
            Confirm Payment
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review your payment method and complete your registration.
          </p>
        </div>

        {/* Total amount to pay */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 rounded-xl px-5 py-4 mt-5 text-center">
          <p className="text-xs font-medium text-gray-500">Total amount to pay</p>
          <p className="text-3xl font-extrabold text-blue-800 mt-1 tracking-tight">{amountLabel}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {name} · {(isClub ? club.club_code : member.member_id) || email}
          </p>
        </div>

        {/* Payment method (single option, pre-selected) */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">Payment Method</p>
          <div className="flex items-center gap-3 rounded-xl border-2 border-blue-600 bg-blue-50/60 px-4 py-3">
            {/* Selected radio */}
            <span className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            </span>
            {/* Visa logo badge */}
            <span className="w-14 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
              <VisaMark />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Credit / Debit Card</p>
              <p className="text-xs text-gray-500">Visa · Secure &amp; Instant</p>
            </div>
          </div>
        </div>

        {/* Secure note */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Your payment information is secure and encrypted.
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}

        {/* Actions */}
        <button
          onClick={handleContinue}
          disabled={!selected || paying}
          className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm mt-5 transition shadow-sm hover:shadow-md"
        >
          {paying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing payment…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Proceed to Payment
            </span>
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={paying}
          className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 mt-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
