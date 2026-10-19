import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BroadcastPopup from '../Common/BroadcastPopup';
import ArchivalAlertModal from '../Admin/ArchivalAlertModal';

const TanyaBPJSBot = lazy(() => import('../Common/TanyaBPJSBot'));
const LiveChatModal = lazy(() => import('../Common/LiveChatModal'));

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState(null);

  useEffect(() => {
    const handleOpenChat = (e) => {
      setChatRecipientId(e.detail?.recipientId || null);
      setChatOpen(true);
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-[#F5F4F0] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#F5F4F0] px-3 sm:px-6 lg:px-8 py-5">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Global AI Regulation Chatbot Assistant (Lazy Loaded) */}
      <Suspense fallback={null}>
        <TanyaBPJSBot />
        {chatOpen && (
          <LiveChatModal
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            defaultRecipientId={chatRecipientId}
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