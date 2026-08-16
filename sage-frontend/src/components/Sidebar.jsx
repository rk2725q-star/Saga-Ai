import { House, HeartPulse, FileText, MessageCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../services/supabaseClient";

function Sidebar({ activePage, setActivePage }) {
  const menuItems = [
    { id: "home",      label: "Home",       icon: House },
    { id: "chat",      label: "Chat",       icon: MessageCircle },
    { id: "health",    label: "Health",     icon: HeartPulse },
    { id: "documents", label: "Documents",  icon: FileText },
  ];

  return (
    <nav className="floating-bottom-nav" aria-label="Main navigation">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;
        return (
          <motion.button
            key={item.id}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            onClick={() => setActivePage(item.id)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            title={item.label}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
          </motion.button>
        );
      })}
      
      <div className="nav-divider" style={{ width: '1px', height: '24px', background: 'var(--c-border)', margin: '0 8px' }}></div>

      <motion.button
        className="bottom-nav-item"
        onClick={async () => {
          const confirmLogout = window.confirm("Are you sure you want to log out?");
          if (confirmLogout) {
            await supabase.auth.signOut();
          }
        }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        title="Logout"
        aria-label="Logout"
        style={{ color: '#EF4444' }}
      >
        <LogOut size={20} strokeWidth={1.8} />
      </motion.button>
    </nav>
  );
}

export default Sidebar;