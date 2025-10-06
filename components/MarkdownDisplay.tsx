import React from 'react';

interface MarkdownDisplayProps {
  content: string;
  title: string;
  isEmbedded?: boolean;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, title, isEmbedded = false }) => {

  const renderMarkdown = (text: string) => {
    // A more robust regex to handle ### followed by optional space
    const sections = text.split(/\n?(###\s*.*?)\n/g).filter(part => part.trim() !== '');
    
    if (sections.length <= 1 && !text.includes('###')) {
        // Fallback for simple text without ### headers
        return text.split('\n').map((paragraph, index) => {
            if (paragraph.trim() === '') return null;
            // A simple bold parser
            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
            const styledParagraph = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });
            return <p key={index} className="mb-4 leading-relaxed">{styledParagraph}</p>
        });
    }

    return sections.map((section, index) => {
      if (section.startsWith('###')) {
        return (
          <h3 key={index} className="text-xl font-semibold mt-6 mb-3 first:mt-0 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
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
            <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-2 my-4">
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
              <p key={lineIndex} className="mb-4 leading-relaxed">
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
  
  const innerContent = (
    <>
      {title && <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">{title}</h2>}
      <div className={`prose prose-slate dark:prose-invert max-w-none ${isEmbedded ? 'prose-sm' : ''}`}>
        {renderMarkdown(content)}
      </div>
    </>
  );

  if (isEmbedded) {
    return innerContent;
  }

  return (
    <div className="bg-white dark:bg-slate-800/40 p-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in-up">
      {innerContent}
    </div>
  );
};

export default MarkdownDisplay;