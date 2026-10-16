import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TanyaBPJSBot from '../Common/TanyaBPJSBot';
import BroadcastPopup from '../Common/BroadcastPopup';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      {/* Global AI Regulation Chatbot Assistant */}
      <TanyaBPJSBot />

      {/* Global Broadcast Toast & Center Modal Alerts */}
      <BroadcastPopup />
    </div>
  );
};

export default Layout;