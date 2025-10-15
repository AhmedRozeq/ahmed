import React from 'react';

export interface Command {
  name: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  action?: () => void;
  prefix?: string;
}

interface SlashCommandMenuProps {
  commands: Command[];
  selectedIndex: number;
  onSelect: (command: Command) => void;
  onHover: (index: number) => void;
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({ commands, selectedIndex, onSelect, onHover }) => {
  return (
    <div 
      className="absolute bottom-full left-0 right-0 mb-2 p-1.5 glass-panel rounded-xl max-h-72 overflow-y-auto animate-fade-in-up" 
      style={{ animationDuration: '200ms' }}
    >
      <p className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Comandi IA
      </p>
      <div className="space-y-1">
        {commands.map((command, index) => {
          const isSelected = index === selectedIndex;
          const Icon = command.icon;
          return (
            <button
              key={command.name}
              onClick={() => onSelect(command)}
              onMouseMove={() => onHover(index)}
              className={`w-full flex items-center gap-4 p-2 text-left rounded-lg transition-colors duration-150 ${
                isSelected 
                  ? 'bg-indigo-100/70 dark:bg-indigo-500/20' 
                  : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/30'
              }`}
            >
              <div 
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  isSelected 
                    ? 'bg-indigo-600 shadow-md' 
                    : 'bg-gray-200/80 dark:bg-gray-700/80'
                }`}
              >
                  <Icon className={`w-5 h-5 transition-colors ${
                    isSelected 
                      ? 'text-white' 
                      : 'text-gray-600 dark:text-gray-300'
                  }`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                  <span className="text-indigo-500 dark:text-indigo-400">/</span>{command.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{command.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlashCommandMenu;