import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import LightbulbIcon from './icons/LightbulbIcon';
import GrammarIcon from './icons/GrammarIcon';
import DictionaryIcon from './icons/DictionaryIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import Tooltip from './Tooltip';

interface SelectionPopoverProps {
  top: number;
  left: number;
  onExplain: () => void;
  onGrammar: () => void;
  onDictionary: () => void;
  onAddToDeck: () => void;
}

const SelectionPopover: React.FC<SelectionPopoverProps> = ({ top, left, onExplain, onGrammar, onDictionary, onAddToDeck }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="absolute z-[100] -translate-x-1/2 translate-y-2.5 md:-translate-y-[calc(100%+10px)] selection-popover-container"
      role="dialog"
    >
      <div className="glass-panel p-1.5 rounded-lg shadow-xl flex items-center gap-1 animate-fade-in-up">
        <Tooltip text="Spiega">
          <button onClick={onExplain} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"><LightbulbIcon className="w-5 h-5"/></button>
        </Tooltip>
        <Tooltip text="Analisi Grammaticale">
          <button onClick={onGrammar} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"><GrammarIcon className="w-5 h-5"/></button>
        </Tooltip>
        <Tooltip text="Dizionario ITA-ARA">
          <button onClick={onDictionary} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"><DictionaryIcon className="w-5 h-5"/></button>
        </Tooltip>
        <Tooltip text="Aggiungi al Deck">
          <button onClick={onAddToDeck} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"><PlusCircleIcon className="w-5 h-5"/></button>
        </Tooltip>
      </div>
    </div>,
    document.body
  );
};

export default SelectionPopover;
