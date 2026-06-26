import React from "react";
import MemberDashboard from "../member/MemberDashboard";

// Club Student dashboard — a member booking facilities under a club, so it also
// gets a "My Club" tab. Shares the MemberDashboard with the independent role.
export default function StudentDashboard() {
  return <MemberDashboard variant="club" />;
}
