import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import LightbulbIcon from './icons/LightbulbIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import MessageCircleIcon from './icons/MessageCircleIcon';
import PlusIcon from './icons/PlusIcon';

interface SelectionPopoverProps {
  range: Range;
  onClose: () => void;
  onExplain: () => void;
  onExplainGrammar: () => void;
  onConversation: () => void;
  onAddToDeck: () => void;
}

const SelectionPopover: React.FC<SelectionPopoverProps> = ({ range, onClose, onExplain, onExplainGrammar, onConversation, onAddToDeck }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{
    top: number;
    left: number;
    opacity: number;
    position: 'top' | 'bottom';
    caretOffset: number;
  }>({ top: -9999, left: -9999, opacity: 0, position: 'top', caretOffset: 0 });

  const calculatePosition = useCallback(() => {
    const popoverEl = popoverRef.current;
    if (!popoverEl || !range) {
      return;
    }

    const selectionRect = range.getBoundingClientRect();
    if (selectionRect.width === 0 && selectionRect.height === 0) {
      onClose();
      return;
    }
    
    // Check if the selection range is at least partially in the viewport
    const isRangeVisible =
      selectionRect.top < window.innerHeight &&
      selectionRect.bottom > 0 &&
      selectionRect.left < window.innerWidth &&
      selectionRect.right > 0;

    // If not visible, hide the popover instead of closing it.
    // This allows it to reappear if scrolled back into view.
    if (!isRangeVisible) {
      setStyle(prev => ({...prev, opacity: 0}));
      return;
    }

    const popoverRect = popoverEl.getBoundingClientRect();
    const { width: popoverWidth, height: popoverHeight } = popoverRect;
    const PADDING = 16;
    const CARET_SIZE = 8;
    
    // Vertical positioning: decide whether to show above or below.
    const spaceAbove = selectionRect.top;
    const spaceBelow = window.innerHeight - selectionRect.bottom;

    let position: 'top' | 'bottom' = 'bottom'; // Default to bottom
    let top = 0;

    // Prefer to position above if there is enough space.
    if (spaceAbove > popoverHeight + CARET_SIZE + PADDING) {
      position = 'top';
    } else if (spaceBelow > popoverHeight + CARET_SIZE + PADDING) {
      position = 'bottom';
    } else {
      // If not enough space either way, pick the side with more space.
      position = spaceAbove > spaceBelow ? 'top' : 'bottom';
    }
    
    if (position === 'top') {
      top = window.scrollY + selectionRect.top - popoverHeight - CARET_SIZE;
    } else {
      top = window.scrollY + selectionRect.bottom + CARET_SIZE;
    }
    
    // Horizontal positioning
    let left = window.scrollX + selectionRect.left + selectionRect.width / 2 - popoverWidth / 2;
    
    // Boundary checks for left position to keep it within the viewport.
    if (left < window.scrollX + PADDING) {
      left = window.scrollX + PADDING;
    }
    if (left + popoverWidth > window.scrollX + window.innerWidth - PADDING) {
      left = window.scrollX + window.innerWidth - popoverWidth - PADDING;
    }

    const selectionCenterX = window.scrollX + selectionRect.left + selectionRect.width / 2;
    const popoverCenterX = left + popoverWidth / 2;
    // Adjust caret position to point to the middle of the selection.
    const caretOffset = selectionCenterX - popoverCenterX;
    
    setStyle({ top, left, opacity: 1, position, caretOffset });
  }, [range, onClose]);
  
  useEffect(() => {
    // A slight delay allows the popover to render and have dimensions before calculating position.
    const timer = setTimeout(calculatePosition, 0);

    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [calculatePosition]);

  const popoverContent = (
    <div
      ref={popoverRef}
      className="absolute z-50 flex items-center gap-1 glass-panel rounded-lg shadow-xl p-1 selection-popover-container dark:ring-1 dark:ring-black/10"
      style={{
        top: `${style.top}px`,
        left: `${style.left}px`,
        opacity: style.opacity,
        transition: 'opacity 0.1s ease-in-out',
        animation: 'fade-in-up 0.2s ease-out'
      }}
      role="toolbar"
    >
      <div
        className="absolute w-0 h-0 pointer-events-none"
        style={{
          left: `calc(50% + ${style.caretOffset}px)`,
          transform: 'translateX(-50%)',
          ...(style.position === 'top'
            ? { bottom: '-8px', borderTop: '8px solid var(--color-panel)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
            : { top: '-8px', borderBottom: '8px solid var(--color-panel)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
          )
        }}
      />
      
      <button
        onMouseDown={(e) => { e.stopPropagation(); onAddToDeck(); }}
        className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 rounded-md text-sm font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
        aria-label="Aggiungi al deck di studio"
      >
        <PlusIcon className="w-4 h-4 text-violet-500 dark:text-violet-400" />
        Aggiungi
      </button>
      <div className="w-px h-5 bg-slate-300/80 dark:bg-slate-600/80"></div>
      <button
        onMouseDown={(e) => { e.stopPropagation(); onExplain(); }}
        className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 rounded-md text-sm font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
        aria-label="Spiega testo selezionato"
      >
        <LightbulbIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        Spiega
      </button>
      <div className="w-px h-5 bg-slate-300/80 dark:bg-slate-600/80"></div>
      <button
        onMouseDown={(e) => { e.stopPropagation(); onExplainGrammar(); }}
        className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 rounded-md text-sm font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
        aria-label="Analizza grammatica del testo selezionato"
      >
        <BookOpenIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
        Grammatica
      </button>
      <div className="w-px h-5 bg-slate-300/80 dark:bg-slate-600/80"></div>
      <button
        onMouseDown={(e) => { e.stopPropagation(); onConversation(); }}
        className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 rounded-md text-sm font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
        aria-label="Pratica conversazione con il testo selezionato"
      >
        <MessageCircleIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        Pratica
      </button>
    </div>
  );

  return ReactDOM.createPortal(popoverContent, document.body);
};

export default SelectionPopover;
