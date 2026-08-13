import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Health from "./pages/Health";
import Documents from "./pages/Documents";

function App() {
  const [activePage, setActivePage] = useState("home");

  return (
    <div className="app">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">

        {activePage === "home" && (
          <Home />
        )}

        {activePage === "health" && (
          <Health />
        )}

        {activePage === "documents" && (
          <Documents />
        )}

      </main>

    </div>
  );
}

export default App;