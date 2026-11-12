import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Bilah aktivitas mikro global di bagian paling atas viewport.
 * Bereaksi terhadap request jaringan aktif ('api-activity') maupun transisi perpindahan rute.
 */
export default function GlobalActivityBar() {
  const location = useLocation();
  const [activeRequests, setActiveRequests] = useState(0);
  const [navPulsing, setNavPulsing] = useState(false);
  const navTimerRef = useRef(null);

  useEffect(() => {
    const onApiActivity = (e) => {
      setActiveRequests(Math.max(0, Number(e?.detail?.count || 0)));
    };
    window.addEventListener('api-activity', onApiActivity);
    return () => window.removeEventListener('api-activity', onApiActivity);
  }, []);

  useEffect(() => {
    setNavPulsing(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setNavPulsing(false), 420);
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, [location.pathname, location.search]);

  const isVisible = activeRequests > 0 || navPulsing;

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 h-[3px] z-[99998] pointer-events-none transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="global-activity-bar-fill h-full w-full" />
    </div>
  );
}
