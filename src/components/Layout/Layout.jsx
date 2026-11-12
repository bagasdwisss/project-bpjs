import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BroadcastPopup from '../Common/BroadcastPopup';
import ArchivalAlertModal from '../Admin/ArchivalAlertModal';
import ScrollToTopButton from '../Common/ScrollToTopButton';
import CommandPaletteModal from '../Common/CommandPaletteModal';

const TanyaBPJSBot = lazy(() => import('../Common/TanyaBPJSBot'));
const LiveChatModal = lazy(() => import('../Common/LiveChatModal'));
const WhistleblowingModal = lazy(() => import('../Common/WhistleblowingModal'));

const Layout = ({ children }) => {
  const location = useLocation();
  const mainScrollRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState(null);
  const [whistleblowingOpen, setWhistleblowingOpen] = useState(false);

  useEffect(() => {
    const handleOpenChat = (e) => {
      setChatRecipientId(e.detail?.recipientId || null);
      setChatOpen(true);
    };
    const handleOpenWhistleblowing = () => {
      setWhistleblowingOpen(true);
    };

    window.addEventListener('open-chat', handleOpenChat);
    window.addEventListener('open-whistleblowing', handleOpenWhistleblowing);

    return () => {
      window.removeEventListener('open-chat', handleOpenChat);
      window.removeEventListener('open-whistleblowing', handleOpenWhistleblowing);
    };
  }, []);

  // Scroll smoothly back to top on page switch
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-[#F5F4F0] overflow-hidden font-sans relative">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Scrollable Viewport */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto bg-[#F5F4F0] px-3 sm:px-6 lg:px-8 pb-5 relative">
          {/* Native Scroll-Driven Progress Strip */}
          <div className="scroll-progress-strip -mx-3 sm:-mx-6 lg:-mx-8 mb-5" aria-hidden="true" />
          <div key={location.pathname} className="max-w-[1600px] mx-auto w-full page-stage-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Scroll-To-Top & Global Command Palette */}
      <ScrollToTopButton scrollContainerRef={mainScrollRef} />
      <CommandPaletteModal />

      {/* Global AI Regulation Chatbot Assistant & Modals (Lazy Loaded) */}
      <Suspense fallback={null}>
        <TanyaBPJSBot />
        {chatOpen && (
          <LiveChatModal
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            defaultRecipientId={chatRecipientId}
          />
        )}
        {whistleblowingOpen && (
          <WhistleblowingModal
            isOpen={whistleblowingOpen}
            onClose={() => setWhistleblowingOpen(false)}
          />
        )}
      </Suspense>

      {/* Global Broadcast Toast & Center Modal Alerts */}
      <BroadcastPopup />

      {/* Cold Storage Archival Automated Notification Alert (Admin Only) */}
      <ArchivalAlertModal />
    </div>
  );
};

export default Layout;