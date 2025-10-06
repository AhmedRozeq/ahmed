

const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const calculateStreak = (timestamps: number[]): number => {
  if (timestamps.length === 0) return 0;

  const uniqueDays = Array.from(new Set(timestamps.map(ts => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))).sort((a, b) => b - a); // Sort descending (most recent first)

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const lastStudyDay = new Date(uniqueDays[0]);

  // If last study day was before yesterday, streak is 0
  if (lastStudyDay.getTime() < yesterday.getTime()) {
    return 0;
  }

  let streak = 0;
  let expectedDay = new Date(lastStudyDay);

  for (const ts of uniqueDays) {
    const currentDay = new Date(ts);
    if (isSameDay(currentDay, expectedDay)) {
      streak++;
      expectedDay.setDate(expectedDay.getDate() - 1);
    } else {
      break; // Streak is broken
    }
  }

  return streak;
};

export const recordStudySession = (history: number[]): number[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const hasStudiedToday = history.some(ts => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayTimestamp;
  });

  if (!hasStudiedToday) {
    const newHistory = [...history, todayTimestamp];
    return newHistory;
  }
  return history;
};