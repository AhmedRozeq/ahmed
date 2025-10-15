import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Node } from 'reactflow';
import { generateAdditionalExample } from '../services/geminiService';
import DeckIcon from './icons/DeckIcon';
import WandIcon from './icons/WandIcon';
import QuoteIcon from './icons/QuoteIcon';
import XIcon from './icons/XIcon';
import LoadingSpinner from './LoadingSpinner';

interface CollocationActionPopupProps {
  top: number;
  left: number;
  node: Node<{ label: string }>;
  onClose: () => void;
  onAddToDeck: (voce: string) => void;
  onShowDetails: (voce: string) => void;
  cefrLevel: string;
  register: string;
}

const CollocationActionPopup: React.FC<CollocationActionPopupProps> = ({ top, left, node, onClose, onAddToDeck, onShowDetails, cefrLevel, register }) => {
  const [example, setExample] = useState<{ isLoading: boolean; content: string | null; error: string | null }>({ isLoading: false, content: null, error: null });
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top, left });

  useEffect(() => {
    if (popoverRef.current) {
        const rect = popoverRef.current.getBoundingClientRect();
        let newLeft = left;
        if (newLeft + rect.width / 2 > window.innerWidth - 16) {
            newLeft = window.innerWidth - rect.width / 2 - 16;
        }
        if (newLeft - rect.width / 2 < 16) {
            newLeft = rect.width / 2 + 16;
        }
        setPosition({ top, left: newLeft });
    }
  }, [top, left]);


  const handleGenerateExample = useCallback(async () => {
    setExample({ isLoading: true, content: null, error: null });
    try {
      const newExample = await generateAdditionalExample(
        { voce: node.data.label, spiegazione: '', frase_originale: '' },
        { cefrLevel, register }
      );
      setExample({ isLoading: false, content: newExample, error: null });
    } catch (err) {
      setExample({ isLoading: false, content: null, error: 'Errore' });
    }
  }, [node.data.label, cefrLevel, register]);

  return ReactDOM.createPortal(
    <div
      ref={popoverRef}
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
      className="fixed z-50 w-64 glass-panel p-2 rounded-xl shadow-lg animate-fade-in-up"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200/60 dark:border-gray-700/60">
        <p className="font-bold text-sm truncate px-2 text-gray-800 dark:text-gray-100">{node.data.label}</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
          <XIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1 text-gray-700 dark:text-gray-200">
        <button onClick={() => onAddToDeck(node.data.label)} className="w-full flex items-center gap-3 p-2 text-sm rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
          <DeckIcon className="w-5 h-5 text-emerald-500" /> Aggiungi al Deck
        </button>
        <button onClick={() => onShowDetails(node.data.label)} className="w-full flex items-center gap-3 p-2 text-sm rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
          <WandIcon className="w-5 h-5 text-sky-500" /> Mostra Dettagli
        </button>
        <button onClick={handleGenerateExample} disabled={example.isLoading} className="w-full flex items-center gap-3 p-2 text-sm rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
          <QuoteIcon className="w-5 h-5 text-amber-500" /> Genera Esempio
        </button>
      </div>
      { (example.isLoading || example.content || example.error) && (
        <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
            {example.isLoading && <div className="text-xs text-center p-2"><LoadingSpinner message="" /></div>}
            {example.error && <p className="text-xs text-red-500 p-2">{example.error}</p>}
            {example.content && <p className="text-xs italic text-gray-600 dark:text-gray-300 p-2">"{example.content}"</p>}
        </div>
      )}
    </div>,
     document.body
  );
};

export default CollocationActionPopup;
