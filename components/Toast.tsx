import React, { useEffect, useState } from 'react';
import InfoIcon from './icons/InfoIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XIcon from './icons/XIcon';

interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(onClose, 300); // Match animation duration
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, onClose]);

  const handleClose = () => {
    setIsExiting(true);
  };

  const baseClasses = "flex items-start gap-3 w-full max-w-sm p-4 rounded-lg shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-in-out";
  const typeClasses = {
    error: 'bg-red-50 text-red-800',
    success: 'bg-emerald-50 text-emerald-800',
  };
  const animationClasses = isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0';

  const Icon = type === 'error' ? InfoIcon : CheckCircleIcon;
  const iconColor = type === 'error' ? 'text-red-500' : 'text-emerald-500';

  return (
    <div
      role="alert"
      className={`${baseClasses} ${typeClasses[type]} ${animationClasses}`}
    >
      <Icon className={`w-6 h-6 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm font-medium flex-grow">{message}</p>
      <button
        onClick={handleClose}
        className="text-current opacity-70 hover:opacity-100 p-1 -m-1 rounded-full"
        aria-label="Chiudi notifica"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;