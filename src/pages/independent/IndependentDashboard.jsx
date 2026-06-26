import React from "react";
import MemberDashboard from "../member/MemberDashboard";

// Independent member dashboard — books facilities on their own (no club).
// Shares the MemberDashboard with the club-student role.
export default function IndependentDashboard() {
  return <MemberDashboard variant="independent" />;
}
