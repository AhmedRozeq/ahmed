import React, { useState, useMemo } from 'react';
import { SavedCollocation } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface CalendarViewProps {
  deck: SavedCollocation[];
  onStartSession: (items: SavedCollocation[]) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const CalendarView: React.FC<CalendarViewProps> = ({ deck, onStartSession }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, SavedCollocation[]>();
    deck.forEach(item => {
      if (item.nextReviewDate) {
          const date = new Date(item.nextReviewDate);
          const dateString = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
          if (!map.has(dateString)) {
            map.set(dateString, []);
          }
          map.get(dateString)!.push(item);
      }
    });
    return map;
  }, [deck]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day: Date) => {
    if (selectedDate && day.getTime() === selectedDate.getTime()) {
      setSelectedDate(null); // Toggle off if clicking the same day
    } else {
      setSelectedDate(day);
    }
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth: Date[] = [];
    const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Monday is 0
    
    // Days from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const day = new Date(year, month, i - startingDayOfWeek + 1);
      daysInMonth.push(day);
    }
    
    // Days from current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      daysInMonth.push(new Date(year, month, i));
    }
    
    // Days from next month to fill the grid
    const totalCells = daysInMonth.length > 35 ? 42 : 35;
    const remainingCells = totalCells - daysInMonth.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysInMonth.push(new Date(year, month + 1, i));
    }

    return daysInMonth.map((day, index) => {
      const dateString = day.toISOString().split('T')[0];
      const events = eventsByDate.get(dateString) || [];
      const isCurrentMonth = day.getMonth() === month;
      const isToday = day.getTime() === today.getTime();
      const isSelected = selectedDate && day.getTime() === selectedDate.getTime();

      let dayClasses = 'relative w-full aspect-square flex items-center justify-center rounded-lg transition-colors duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500';
      
      if (!isCurrentMonth) {
        dayClasses += ' text-gray-400 dark:text-gray-500';
      } else if (isSelected) {
        dayClasses += ' bg-indigo-600 text-white font-bold';
      } else if (isToday) {
        dayClasses += ' bg-indigo-100 dark:bg-indigo-900/40 font-bold text-indigo-700 dark:text-indigo-300';
      } else {
        dayClasses += ' text-gray-700 dark:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50';
      }


      return (
        <div key={index} className="p-0.5">
          <button onClick={() => handleDayClick(day)} className={dayClasses} disabled={!isCurrentMonth && events.length === 0}>
            {day.getDate()}
            {events.length > 0 && (
              <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${day.getTime() < today.getTime() ? 'bg-gray-400' : 'bg-amber-500'}`}></div>
            )}
          </button>
        </div>
      );
    });
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return null;
    const dateString = selectedDate.toISOString().split('T')[0];
    return eventsByDate.get(dateString) || [];
  }, [selectedDate, eventsByDate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white/50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">
            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" aria-label="Mese precedente"><ArrowLeftIcon className="w-5 h-5" /></button>
            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors" aria-label="Mese successivo"><ArrowRightIcon className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
          {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarGrid()}
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="bg-white/50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200/60 dark:border-gray-700/50 h-full">
            <h5 className="font-bold text-gray-800 dark:text-gray-100 mb-2">
              {selectedDate ? `Ripasso per il ${selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : "Seleziona un giorno"}
            </h5>
            {selectedDate && selectedDayEvents ? (
              selectedDayEvents.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ul className="flex-grow max-h-64 overflow-y-auto space-y-2 pr-2">
                    {selectedDayEvents.map(item => (
                      <li key={item.id} className="text-sm p-2.5 rounded-md bg-gray-100 dark:bg-gray-800/60">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{item.voce}</p>
                        <div className="flex justify-between items-center mt-1">
                           <span className="text-xs text-gray-500 dark:text-gray-400">{item.tema}</span>
                           <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">SRS {item.srsLevel}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex-shrink-0">
                    <button 
                      onClick={() => onStartSession(selectedDayEvents!)}
                      className="w-full px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Avvia Sessione ({selectedDayEvents.length} voci)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nessuna voce da ripassare per questo giorno.</p>
              )
            ) : (
                 <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Clicca su un giorno nel calendario per vedere le voci da ripassare.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
