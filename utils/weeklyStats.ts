import { MemoryItem } from '../types';

export interface WeeklyStats {
    thisWeekCount: number;
    lastWeekCount: number;
    streakDays: number;
    topCategory: string | null;
    topCategoryCount: number;
    totalCompleted: number;
}

export function computeWeeklyStats(memories: MemoryItem[]): WeeklyStats {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const dayMs  = 24 * 60 * 60 * 1000;

    const allCompleted = memories
        .flatMap(m => m.actions ?? [])
        .filter(a => a.completed && a.completedAt != null);

    const thisWeekStart = now - weekMs;
    const lastWeekStart = now - 2 * weekMs;

    const thisWeek = allCompleted.filter(a => a.completedAt! >= thisWeekStart);
    const lastWeek = allCompleted.filter(
        a => a.completedAt! >= lastWeekStart && a.completedAt! < thisWeekStart
    );

    // Top category this week
    const catCounts: Record<string, number> = {};
    for (const a of thisWeek) {
        if (a.category) catCounts[a.category] = (catCounts[a.category] ?? 0) + 1;
    }
    const topEntry = Object.entries(catCounts).sort((x, y) => y[1] - x[1])[0];

    // Streak: consecutive calendar days with ≥1 completion, ending today or yesterday
    const dayKey = (ts: number): string => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };
    const completionDays = new Set(allCompleted.map(a => dayKey(a.completedAt!)));

    const todayKey     = dayKey(now);
    const yesterdayKey = dayKey(now - dayMs);

    let streakDays = 0;
    if (completionDays.has(todayKey) || completionDays.has(yesterdayKey)) {
        let cursor = completionDays.has(todayKey) ? now : now - dayMs;
        while (completionDays.has(dayKey(cursor))) {
            streakDays++;
            cursor -= dayMs;
        }
    }

    return {
        thisWeekCount:    thisWeek.length,
        lastWeekCount:    lastWeek.length,
        streakDays,
        topCategory:      topEntry ? topEntry[0] : null,
        topCategoryCount: topEntry ? topEntry[1] : 0,
        totalCompleted:   allCompleted.length,
    };
}
