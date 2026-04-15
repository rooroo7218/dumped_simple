import React, { useMemo } from 'react';
import {
    eachDayOfInterval,
    endOfDay,
    format,
    getDay,
    startOfDay,
    subYears,
} from 'date-fns';

type Activity = {
    date: Date;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
};

type CalendarData = {
    date: string; // "YYYY-MM-DD"
    count: number;
}[];

const LEVELS: Record<number, string> = {
    0: 'rgba(15,23,42,0.03)',  // grey — no activity
    1: '#c4b5fd',              // purple-300 — light
    2: '#a78bfa',              // purple-400
    3: '#7c3aed',              // purple-700
    4: '#4c1d95',              // purple-900 — deep
};

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Week {
    days: (Activity | null)[];
    monthLabel: string | null; // set on first day of a new month
}

function buildWeeks(data: CalendarData, start: Date, end: Date): Week[] {
    const allDays = eachDayOfInterval({ start, end });

    // Build a lookup map
    const lookup: Record<string, number> = {};
    data.forEach(d => { lookup[d.date] = d.count; });

    const activities: Activity[] = allDays.map(date => {
        const key = format(date, 'yyyy-MM-dd');
        const count = lookup[key] ?? 0;
        return { date, count, level: getLevel(count) };
    });

    const weeks: Week[] = [];
    let week: (Activity | null)[] = [];
    let seenMonths = new Set<string>();

    // Pad beginning so Sunday lands in column 0
    const firstWeekday = getDay(activities[0].date);
    for (let i = 0; i < firstWeekday; i++) week.push(null);

    for (const activity of activities) {
        week.push(activity);

        if (week.length === 7) {
            const realDays = week.filter(Boolean) as Activity[];
            const firstReal = realDays[0];
            let monthLabel: string | null = null;
            if (firstReal) {
                const monthKey = format(firstReal.date, 'yyyy-MM');
                if (!seenMonths.has(monthKey)) {
                    seenMonths.add(monthKey);
                    monthLabel = format(firstReal.date, 'MMM');
                }
            }
            weeks.push({ days: week, monthLabel });
            week = [];
        }
    }

    // Last partial week
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push({ days: week, monthLabel: null });
    }

    return weeks;
}

interface DumpCalendarProps {
    data: CalendarData;
}

export const DumpCalendar: React.FC<DumpCalendarProps> = ({ data }) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subYears(end, 1));

    const weeks = useMemo(() => {
        const built = buildWeeks(data, start, end);

        // Reverse so most recent week is on top, then re-derive month/year labels
        const reversed = [...built].reverse();
        const seenMonths = new Set<string>();
        const seenYears = new Set<string>();

        reversed.forEach(week => {
            week.monthLabel = null;
            const realDays = week.days.filter(Boolean) as Activity[];
            const firstReal = realDays[0];
            if (!firstReal) return;

            const monthKey = format(firstReal.date, 'yyyy-MM');
            if (!seenMonths.has(monthKey)) {
                seenMonths.add(monthKey);
                const yearKey = format(firstReal.date, 'yy');
                if (!seenYears.has(yearKey)) {
                    seenYears.add(yearKey);
                    week.monthLabel = format(firstReal.date, "MMM ''yy");
                } else {
                    week.monthLabel = format(firstReal.date, 'MMM');
                }
            }
        });

        return reversed;
    }, [data]);

    return (
        <div style={{ width: '100%' }}>
            {/* Day-of-week header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 3,
                marginBottom: 6,
            }}>
                {DAY_LABELS.map((label, i) => (
                    <div
                        key={i}
                        style={{
                            textAlign: 'center',
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'rgba(15,23,42,0.6)',
                                                        userSelect: 'none',
                        }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Weeks — each row is one week */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {weeks.map((week, wi) => (
                    <div key={wi} style={{ position: 'relative' }}>
                        {/* Month label floats left of row */}
                        {week.monthLabel && (
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: '50%',
                                transform: 'translateY(-50%) translateX(calc(-100% - 6px))',
                                fontSize: 8,
                                fontWeight: 800,
                                letterSpacing: '0.07em',
                                textTransform: 'uppercase',
                                color: 'rgba(15,23,42,0.55)',
                                                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                            }}>
                                {week.monthLabel}
                            </div>
                        )}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 3,
                        }}>
                            {week.days.map((day, di) => (
                                <div
                                    key={di}
                                    title={day ? `${format(day.date, 'MMM d')}: ${day.count} dump${day.count !== 1 ? 's' : ''}` : ''}
                                    style={{
                                        aspectRatio: '1',
                                        borderRadius: '50%',
                                        background: day ? LEVELS[day.level] : 'transparent',
                                        outline: day ? '1px solid rgba(0,0,0,0.7)' : 'none',
                                        transition: 'background 0.15s',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
