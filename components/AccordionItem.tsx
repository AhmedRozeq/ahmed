import React, { useState, useRef } from 'react';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  startOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, startOpen = false }) => {
  const [isOpen, setIsOpen] = useState(startOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border border-slate-200/80 rounded-lg overflow-hidden transition-all duration-300 bg-white/50 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 bg-slate-50/70 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 transition-colors"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-slate-800 text-left">{title}</h3>
        <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-300 transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        ref={contentRef}
        style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px' }}
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
      >
        <div className="p-5 border-t border-slate-200/80">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;