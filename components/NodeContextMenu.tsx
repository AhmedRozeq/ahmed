

import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Collocation, ThemeExplanationResult } from '../types';
import WandIcon from './icons/WandIcon';
import EditIcon from './icons/EditIcon';
import { explainTheme } from '../services/geminiService';
import InfoIcon from './icons/InfoIcon';
import UsersIcon from './icons/UsersIcon';
import Edit3Icon from './icons/Edit3Icon';

interface NodeContextMenuProps {
  x: number;
  y: number;
  node: Node;
  onThemeDeepDive: (theme: string) => void;
  onCollocationDeepDive: (voce: string) => void;
  onQuiz: (collocation: Collocation) => void;
  onClose: () => void;
  onToggleCollapse: (nodeId: string) => void;
  isCollapsed: boolean;
  onRolePlay: (collocation: Collocation) => void;
  onRename: (nodeId: string) => void;
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ x, y, node, onThemeDeepDive, onCollocationDeepDive, onQuiz, onClose, onToggleCollapse, isCollapsed, onRolePlay, onRename }) => {
  const [themeExplanation, setThemeExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const isTheme = node.data.type === 'theme';
  const isCollocation = node.data.type === 'collocation';
  const themeName = isTheme ? node.data.fullData.tema : '';


  useEffect(() => {
    setThemeExplanation(null);
    setIsLoadingExplanation(false);
    setExplanationError(null);

    if (isTheme) {
      const fetchExplanation = async () => {
        setIsLoadingExplanation(true);
        try {
          const result: ThemeExplanationResult = await explainTheme(themeName);
          setThemeExplanation(result.explanation);
        } catch (err) {
            setExplanationError("Spiegazione non disponibile.");
        } finally {
          setIsLoadingExplanation(false);
        }
      };
      fetchExplanation();
    }
  }, [node.id, themeName, isTheme]);

  const handleDeepDive = () => {
    if (isTheme) onThemeDeepDive(themeName);
    if (isCollocation) onCollocationDeepDive(node.data.label);
    onClose();
  };
  
  const handleQuiz = () => {
    if (isCollocation) onQuiz(node.data.fullData);
    onClose();
  };

  const handleRolePlay = () => {
    if (isCollocation) onRolePlay(node.data.fullData);
    onClose();
  };

  const handleToggleCollapse = () => {
    onToggleCollapse(node.id);
    onClose();
  };

  const handleRename = () => {
    onRename(node.id);
    onClose();
  };
  
  return (
    <div
      style={{ top: y, left: x }}
      className="absolute z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200/80 dark:border-slate-700/80 w-64 animate-fade-in-up"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="p-2 border-b border-slate-200/80 dark:border-slate-700/80">
         <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={node.data.label}>{node.data.label}</p>
         <p className="text-xs text-slate-500 dark:text-slate-400">{isTheme ? 'Tema' : 'Collocazione'}</p>
      </div>

      {isTheme && (
        <div className="p-3 border-b border-slate-100 dark:border-slate-700 text-sm">
          {isLoadingExplanation && (
            <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 py-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Caricamento...</span>
            </div>
          )}
          {explanationError && (
            <div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded-md flex items-start gap-2 text-xs">
              <InfoIcon className="w-4 h-4 mt-px flex-shrink-0"/>
              <span>{explanationError}</span>
            </div>
          )}
          {themeExplanation && (
            <p className="text-slate-700 dark:text-slate-300">{themeExplanation}</p>
          )}
        </div>
      )}

      <div className="p-2 space-y-1">
        <button 
            onClick={handleDeepDive}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
        >
            <WandIcon className="w-4 h-4 text-sky-500" />
            <span>{isTheme ? 'Approfondisci Tema' : 'Approfondisci'}</span>
        </button>
        {isTheme && (
            <>
                <button
                    onClick={handleRename}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
                >
                    <Edit3Icon className="w-4 h-4 text-slate-500" />
                    <span>Rinomina Tema</span>
                </button>
                <button
                    onClick={handleToggleCollapse}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
                >
                    <span className="w-4 h-4 text-slate-500 text-center font-mono select-none">{isCollapsed ? '+' : '−'}</span>
                    <span>{isCollapsed ? 'Espandi Tema' : 'Collassa Tema'}</span>
                </button>
            </>
        )}
        {isCollocation && (
            <>
                <button 
                    onClick={handleQuiz}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
                >
                    <EditIcon className="w-4 h-4 text-amber-500"/>
                    <span>Mettiti alla Prova</span>
                </button>
                <button 
                    onClick={handleRolePlay}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
                >
                    <UsersIcon className="w-4 h-4 text-emerald-500"/>
                    <span>Crea Dialogo</span>
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default NodeContextMenu;