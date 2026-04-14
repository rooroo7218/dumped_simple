import React, { useState, useEffect } from 'react';
import { databaseService } from '../services/databaseService';
import { DumpCalendar } from './ui/dump-calendar';

export const PatternHub: React.FC = () => {
    const [calendarData, setCalendarData] = useState<{ date: string; count: number }[]>([]);

    useEffect(() => {
        databaseService.fetchDumpCalendarData().then(setCalendarData);
    }, []);

    return (
        <div style={{
            width: '100%',
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px 24px 52px', // extra left padding for month labels
            boxSizing: 'border-box',
        }}>
            <div style={{ width: '100%', maxWidth: 480 }}>
                <DumpCalendar data={calendarData} />
            </div>
        </div>
    );
};
