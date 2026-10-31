import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";

import DashboardInsight from "./components/DashboardInsight";

// ลิงก์เก่าแบบ /dashboard?view=... -> path ใหม่
const LEGACY_VIEW_PATHS = {
  alerts: "/alerts",
  settings: "/settings",
  users: "/settings/manage-user",
};

export default function DashboardPage() {
  const { things, loading, error } = useOutletContext();
  const [searchParams] = useSearchParams();
  const legacyView = searchParams.get("view");

  if (legacyView) {
    const target = LEGACY_VIEW_PATHS[legacyView] || "/dashboard";
    let next;
    if (target === "/dashboard") {
      next = new URLSearchParams(searchParams);
      next.delete("view");
    } else if (target === "/alerts") {
      // alerts ใช้แค่ station/tab
      next = new URLSearchParams();
      for (const key of ["station", "tab"]) {
        if (searchParams.get(key)) next.set(key, searchParams.get(key));
      }
    } else {
      next = new URLSearchParams(); // หน้า settings ไม่ใช้ query
    }
    const search = next.toString();
    return <Navigate replace to={search ? `${target}?${search}` : target} />;
  }

  return <DashboardInsight things={things} loading={loading} error={error} />;
}
