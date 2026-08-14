import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Brain, LineChart, Shield, ShieldCheck } from 'lucide-react';

function Home({ setActivePage }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0 } }
  };

  return (
    <div className="landing-page">
      <div className="landing-scroll-area">
        
        {/* HERO SECTION */}
        <section className="hero-section">
          <motion.div 
            className="hero-content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div className="hero-badge" variants={itemVariants}>
              <Brain size={14} />
              <span>Introducing SAGE AI Health Memory</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants}>
              Your health, <br/>
              <span className="text-gradient">understood.</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="hero-subtitle">
              SAGE helps you understand your health information, track your symptoms over time, and build a secure, private memory of your wellness journey. Clinical minimalist design for your peace of mind.
            </motion.p>
            
            <motion.div className="hero-actions" variants={itemVariants}>
              <button 
                className="btn-primary" 
                onClick={() => setActivePage('chat')}
              >
                Get Started <ArrowRight size={16} />
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setActivePage('health')}
              >
                Explore SAGE
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="hero-image-container"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0, duration: 0.8 }}
          >
            <div className="hero-image-glow"></div>
            <img src="/sage_dashboard.png" alt="SAGE AI Dashboard" className="hero-image" />
          </motion.div>
        </section>

        {/* FEATURES SECTION */}
        <section className="features-section">
          <div className="features-header">
            <h2>Intelligent Health Management</h2>
            <p>Purpose-built tools to bring clarity to your personal health narrative.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <MessageSquare size={24} />
              </div>
              <h3>AI Health Conversation</h3>
              <p>Engage in natural dialogues about your symptoms, medications, and wellness goals. SAGE listens, analyzes, and provides clinically-grounded insights.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Brain size={24} />
              </div>
              <h3>Personal Health Memory</h3>
              <p>A chronological, intelligent record of your health events. Never forget a symptom timeline or a reaction detail for your next doctor's visit.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <LineChart size={24} />
              </div>
              <h3>Health Insights</h3>
              <p>Identify patterns in your sleep, diet, and symptoms over time. Subtle visual data tools help you spot correlations you might otherwise miss.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ShieldCheck size={24} />
              </div>
              <h3>Private by Design</h3>
              <p>Your health data is highly sensitive. We utilize end-to-end encryption and strict access controls. You own your data.</p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="cta-section">
          <div className="cta-box">
            <h2>Ready to understand your health?</h2>
            <p>Join thousands of professionals taking control of their wellness narrative with SAGE AI.</p>
            <button 
              className="btn-primary large"
              onClick={() => setActivePage('chat')}
            >
              Get Started Free
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="footer-content">
            <span className="copyright">© 2026 SAGE AI. Clinical Minimalist UI.</span>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default Home;