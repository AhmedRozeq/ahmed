import React, { useState, useEffect } from 'react';
import QuickStartGuide from './QuickStartGuide';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) {
    return null;
  }


  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-slate-50 dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
            <QuickStartGuide />
        </div>
        <footer className="p-4 border-t border-slate-200 dark:border-slate-700/80 text-right sticky bottom-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
             <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
                Ho Capito!
            </button>
        </footer>
      </div>
    </div>
  );
};

export default GuideModal;