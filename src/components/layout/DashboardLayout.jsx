import Sidebar from "./Sidebar";

export default function DashboardLayout({
  children,
  title
}) {
  return (
    <div className="dashboard-shell">

      <Sidebar />

      <div className="dashboard-main">

        <header className="dashboard-topbar">

          <p className="eyebrow">
            WESTFORCE PORTFOLIO
          </p>

          <h1>
            {title}
          </h1>

        </header>

        <main className="dashboard-content">
          {children}
        </main>

      </div>

    </div>
  );
}