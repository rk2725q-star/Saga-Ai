import {
  House,
  HeartPulse,
  FileText,
  Settings
} from "lucide-react";

function Sidebar({ activePage, setActivePage }) {

  const menuItems = [
    {
      id: "home",
      label: "SAGE",
      icon: House
    },
    {
      id: "health",
      label: "My Health",
      icon: HeartPulse
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText
    }
  ];

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-circle">
          S
        </div>

        <div>
          <h2>SAGE</h2>
          <span>Health Companion</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-navigation">

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={
                activePage === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );

        })}

      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">

        <button className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;