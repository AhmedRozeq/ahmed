
import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => (
    <div className="relative group">
        {children}
        <div
            role="tooltip"
            className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-white text-xs whitespace-nowrap rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none z-50 ${className ?? ''}`}
        >
            {text}
        </div>
    </div>
);

export default Tooltip;
