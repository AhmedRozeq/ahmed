import React from 'react';

interface MarkdownDisplayProps {
  content: string;
  title: string;
  isEmbedded?: boolean;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, title, isEmbedded = false }) => {

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    // Regex for bold text and markdown links
    const regex = /(\*\*.*?\*\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
        const [fullMatch, boldText, linkText, url] = match;
        const matchIndex = match.index!;
        
        // Add text before the match
        if (matchIndex > lastIndex) {
            nodes.push(text.substring(lastIndex, matchIndex));
        }
        
        if (boldText) {
            nodes.push(<strong key={matchIndex}>{boldText.slice(2, -2)}</strong>);
        } else if (linkText && url) {
            nodes.push(<a href={url} key={matchIndex} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">{linkText}</a>);
        }
        
        lastIndex = matchIndex + fullMatch.length;
    }
    
    // Add any remaining text after the last match
    if (lastIndex < text.length) {
        nodes.push(text.substring(lastIndex));
    }
    
    // If nodes is empty, just return the original text
    return nodes.length > 0 ? nodes : [text];
  };

  const renderMarkdown = (text: string) => {
    // A more robust regex to handle ### followed by optional space
    const sections = text.split(/\n?(###\s*.*?)\n/g).filter(part => part.trim() !== '');
    
    if (sections.length <= 1 && !text.includes('###')) {
        // Fallback for simple text without ### headers
        return text.split('\n').map((paragraph, index) => {
            if (paragraph.trim() === '') return null;
            return <p key={index} className="mb-4 leading-relaxed">{parseInlineFormatting(paragraph)}</p>;
        });
    }

    return sections.map((section, index) => {
      if (section.startsWith('###')) {
        const titleText = section.replace(/###\s*/, '').trim();
        const emojiRegex = /(\p{Emoji})/u;
        const match = titleText.match(emojiRegex);
        const emoji = match ? match[1] : null;
        const text = emoji ? titleText.replace(emoji, '').trim() : titleText;

        return (
          <h3 key={index} className="flex items-center gap-3 text-xl font-bold mt-6 mb-4 first:mt-0 text-gray-800 dark:text-gray-100">
            {emoji && <span className="text-2xl">{emoji}</span>}
            <span className="border-b-2 border-indigo-200 dark:border-indigo-800 pb-1">{text}</span>
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
        
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const itemContent = trimmedLine.substring(2);
          currentList.push(<li key={lineIndex}>{parseInlineFormatting(itemContent)}</li>);
        } else {
          flushList();
          if (trimmedLine) {
            elements.push(
              <p key={lineIndex} className="mb-4 leading-relaxed">
                {parseInlineFormatting(trimmedLine)}
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