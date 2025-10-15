import React from 'react';
import { SavedCollocation } from '../types';
import TrendingUpIcon from './icons/TrendingUpIcon';

interface MasteryChartProps {
  deck: SavedCollocation[];
}

const MAX_SRS_LEVEL_FOR_MASTERY = 5; // Considered "mastered" when reaching this level or higher

const MasteryChart: React.FC<MasteryChartProps> = ({ deck }) => {
  const masteryByTheme = React.useMemo(() => {
    const themes: Record<string, { total: number; mastered: number }> = {};
    deck.forEach(item => {
      if (!themes[item.tema]) {
        themes[item.tema] = { total: 0, mastered: 0 };
      }
      themes[item.tema].total++;
      if (item.srsLevel >= MAX_SRS_LEVEL_FOR_MASTERY) {
        themes[item.tema].mastered++;
      }
    });
    return Object.entries(themes)
      .map(([tema, data]) => ({
        tema,
        percentage: data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [deck]);

  if (masteryByTheme.length === 0) {
    return (
        <div className="text-center py-8 text-slate-500">
            <TrendingUpIcon className="w-12 h-12 mx-auto text-slate-400" />
            <p className="mt-4">Completa le sessioni di studio per vedere i tuoi progressi di maestria qui.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {masteryByTheme.map(({ tema, percentage }) => (
        <div key={tema}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-slate-700">{tema}</span>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{percentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-indigo-400 to-violet-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default MasteryChart;