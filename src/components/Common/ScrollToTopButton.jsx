import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { prefersReducedMotion, triggerMicroFeedback } from '../../utils/microFeedback';

/**
 * Tombol mikro mengambang untuk kembali cepat ke atas area konten yang digulir.
 */
export default function ScrollToTopButton({ scrollContainerRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return undefined;

    let lastVisible = false;
    const onScroll = () => {
      const nextVisible = el.scrollTop > 300;
      if (nextVisible !== lastVisible) {
        lastVisible = nextVisible;
        setVisible(nextVisible);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  if (!visible) return null;

  const handleClick = () => {
    triggerMicroFeedback('tap');
    const el = scrollContainerRef?.current;
    if (el) {
      el.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Kembali ke atas halaman"
      title="Kembali ke atas"
      className="fixed bottom-5 left-4 lg:left-[17rem] z-30 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white hover:bg-[#FCE373] text-[#121214] border-2 border-[#121214] shadow-[3px_3px_0px_#121214] text-xs font-black transition-all duration-150 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer animate-in fade-in zoom-in-95"
    >
      <ArrowUp className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Ke Atas</span>
    </button>
  );
}
