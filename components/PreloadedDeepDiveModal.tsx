import React, { useState, useEffect } from 'react';

interface PreloadedDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  title: string | null;
}

const PreloadedDeepDiveModal: React.FC<PreloadedDeepDiveModalProps> = ({ isOpen, onClose, content, title }) => {
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
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deep-dive-title"
    >
      <div
        className={`bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <h2 id="deep-dive-title" className="text-lg font-semibold text-slate-800 truncate">
            Approfondimento Esperto: <span className="text-sky-600 font-bold">"{title}"</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100"
            aria-label="Chiudi modale"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto">
          {content && <div className="prose prose-slate max-w-none">{renderMarkdown(content)}</div>}
        </div>
      </div>
    </div>
  );
};

export default PreloadedDeepDiveModal;