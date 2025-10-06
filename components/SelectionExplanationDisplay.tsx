import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import InfoIcon from './icons/InfoIcon';
import XCircleIcon from './icons/XCircleIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import BookOpenIcon from './icons/BookOpenIcon';

interface SelectionExplanationDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  content: string | null;
  error: string | null;
  item: string | null;
  type: 'explanation' | 'grammar';
}

const SelectionExplanationDisplay: React.FC<SelectionExplanationDisplayProps> = ({ isOpen, onClose, isLoading, content, error, item, type }) => {
  if (!isOpen) return null;

  const title = type === 'grammar' ? 'Analisi Grammaticale' : 'Spiegazione';
  const Icon = type === 'grammar' ? BookOpenIcon : LightbulbIcon;
  const loadingMessage = type === 'grammar' ? 'Analisi in corso...' : 'Caricamento spiegazione...';

  const renderMarkdown = (text: string) => {
    const sections = text.split(/\n?(###\s*.*?)\n/g).filter(part => part.trim() !== '');
    
    if (sections.length <= 1 && !text.includes('###')) {
        return text.split('\n').map((paragraph, index) => {
            if (paragraph.trim() === '') return null;
            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
            const styledParagraph = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });
            return <p key={index} className="text-slate-700 mb-4 leading-relaxed">{styledParagraph}</p>
        });
    }

    return sections.map((section, index) => {
      if (section.startsWith('###')) {
        return (
          <h3 key={index} className="text-2xl font-semibold text-slate-800 mt-6 mb-3 first:mt-0 border-b border-slate-200 pb-2">
            {section.replace(/###\s*/, '').trim()}
          </h3>
        );
      }
      
      const lines = section.trim().split('\n');
      const elements: React.ReactNode[] = [];
      let currentList: React.ReactNode[] = [];

      const flushList = () => {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-2 my-4 text-slate-700">
              {currentList}
            </ul>
          );
          currentList = [];
        }
      };

      lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
        const styledLine = parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const itemContent = trimmedLine.substring(2);
           const styledItemContent = itemContent.split(/(\*\*.*?\*\*)/g).map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
              }
              return part;
            });
          currentList.push(<li key={lineIndex}>{styledItemContent}</li>);
        } else {
          flushList();
          if (trimmedLine) {
            elements.push(
              <p key={lineIndex} className="text-slate-700 mb-4 leading-relaxed">
                {styledLine}
              </p>
            );
          }
        }
      });

      flushList();
      return <div key={index}>{elements}</div>;
    });
  };

  return (
    <div className="my-6 glass-panel p-6 sm:p-8 rounded-2xl shadow-lg animate-fade-in-up relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-200/50 transition-colors"
        aria-label="Chiudi spiegazione"
      >
        <XCircleIcon className="w-6 h-6" />
      </button>

      <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
        <Icon className="w-7 h-7 text-sky-500" />
        <span>{title} di: <span className="text-sky-600">"{item}"</span></span>
      </h2>

      {isLoading && <LoadingSpinner message={loadingMessage} />}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 border-l-4 border-red-500 rounded-r-md flex items-center gap-3">
          <InfoIcon className="w-6 h-6 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {content && !isLoading && !error && (
        <div className="prose prose-slate max-w-none mt-4">
            {renderMarkdown(content)}
        </div>
      )}
    </div>
  );
};

export default SelectionExplanationDisplay;