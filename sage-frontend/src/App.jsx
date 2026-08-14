import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Health from "./pages/Health";
import Documents from "./pages/Documents";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const [activePage, setActivePage] = useState("home");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [healthData, setHealthData] = useState({
    heartRate: null,
    bloodPressure: null,
    steps: null,
  });

  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.98 }
  };

  const pageTransition = {
    type: "spring",
    bounce: 0,
    duration: 0.4
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">
        <AnimatePresence mode="wait">
          {activePage === "home" && (
            <motion.div 
              key="home"
              className="page-container"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Home setActivePage={setActivePage} />
            </motion.div>
          )}

          {activePage === "chat" && (
            <motion.div 
              key="chat"
              className="page-container"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Chat 
                setUploadedFiles={setUploadedFiles} 
                setHealthData={setHealthData} 
              />
            </motion.div>
          )}

          {activePage === "health" && (
            <motion.div 
              key="health"
              className="page-container"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Health healthData={healthData} />
            </motion.div>
          )}

          {activePage === "documents" && (
            <motion.div 
              key="documents"
              className="page-container"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Documents uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;