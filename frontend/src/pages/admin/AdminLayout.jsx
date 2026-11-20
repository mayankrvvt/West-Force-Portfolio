import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, BriefcaseBusiness, Settings2, Users } from "lucide-react";

import PageSkeleton from "../../components/dashboard/Skeleton";

const TABS = [
  { name: "Jobs", path: "/admin/jobs", icon: BriefcaseBusiness },
  { name: "Admins", path: "/admin/admins", icon: Users },
  { name: "Site settings", path: "/admin/settings", icon: Settings2 },
  { name: "Activity", path: "/admin/activity", icon: Activity },
];

/** Tabs across the top of every admin page. */
export default function AdminLayout() {
  return <>
    <nav className="admin-tabs" aria-label="Admin">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return <NavLink key={tab.path} to={tab.path} className={({ isActive }) => `admin-tab${isActive ? " active" : ""}`}>
          <Icon size={16} aria-hidden="true" />
          <span>{tab.name}</span>
        </NavLink>;
      })}
    </nav>
    <Suspense fallback={<PageSkeleton layout="list" label="Loading" />}>
      <Outlet />
    </Suspense>
  </>;
}
