import { useRef, useCallback } from 'react';
import { MemoryItem, DiaryEntry, UserPersona } from '../types';
import { updateUserProfile } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

const DUMPS_TRIGGER = 10;
const JOURNALS_TRIGGER = 3;

function computeCategoryStats(
  memories: MemoryItem[]
): Record<string, { total: number; completed: number; lastUpdated: number }> {
  const stats: Record<string, { total: number; completed: number; lastUpdated: number }> = {};
  for (const m of memories) {
    for (const action of m.actions ?? []) {
      const cat = action.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, completed: 0, lastUpdated: Date.now() };
      stats[cat].total++;
      if (action.completed) stats[cat].completed++;
    }
  }
  return stats;
}

function computeMoodTrends(
  diaryEntries: DiaryEntry[]
): UserPersona['moodTrends'] {
  const recent = diaryEntries.slice(0, 10);
  const moodCounts: Record<string, number> = {};
  for (const e of recent) {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
  }
  const dominantMoods = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([mood]) => mood);

  const lowEnergyMoods = ['tired', 'anxious', 'frustrated'];
  const highEnergyMoods = ['elated', 'joy'];
  const lowCount = recent.filter(e => e.mood && lowEnergyMoods.includes(e.mood)).length;
  const highCount = recent.filter(e => e.mood && highEnergyMoods.includes(e.mood)).length;
  const energySignal: UserPersona['moodTrends']['energySignal'] =
    highCount > lowCount ? 'high' : lowCount > highCount ? 'low' : 'medium';

  return {
    dominantMoods,
    moodHistory: diaryEntries.slice(0, 30).map(e => ({ mood: e.mood ?? 'neutral', timestamp: e.timestamp })),
    energySignal,
  };
}

function shouldTriggerAI(
  memories: MemoryItem[],
  diaryEntries: DiaryEntry[],
  persona: UserPersona
): boolean {
  const dumpsAtLast = persona.aiObservations?.dumpsAtLastUpdate ?? 0;
  const journalsAtLast = persona.aiObservations?.journalsAtLastUpdate ?? 0;
  const dumpsSince = memories.length - dumpsAtLast;
  const journalsSince = diaryEntries.length - journalsAtLast;
  return dumpsSince >= DUMPS_TRIGGER || journalsSince >= JOURNALS_TRIGGER;
}

export function useProfileUpdater(
  memories: MemoryItem[],
  diaryEntries: DiaryEntry[],
  persona: UserPersona,
  setPersona: (p: UserPersona) => void
): {
  triggerAfterDump: (content: string) => void;
  triggerAfterJournal: () => void;
  triggerAfterTaskCompletion: () => void;
} {
  const isRunningRef = useRef(false);

  const runUpdate = useCallback(async (source: 'dump' | 'journal' | 'task', dumpContent?: string) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      // Always update behavioral patterns + mood trends (client-side, free)
      const categoryStats = computeCategoryStats(memories);
      const avoidedCategories = Object.entries(categoryStats)
        .filter(([, s]) => s.total >= 3 && s.completed / s.total < 0.25)
        .map(([cat]) => cat);

      const updatedBehavioral: UserPersona['behavioralPatterns'] = {
        categoryStats,
        avoidedCategories,
      };
      const updatedMoodTrends = computeMoodTrends(diaryEntries);

      // Check if AI call is warranted
      const needsAI = source !== 'task' && shouldTriggerAI(memories, diaryEntries, persona);

      if (!needsAI) {
        const partial: UserPersona = {
          ...persona,
          behavioralPatterns: updatedBehavioral,
          moodTrends: updatedMoodTrends,
          lastUpdated: Date.now(),
        };
        setPersona(partial);
        databaseService.savePersona(partial);
        return;
      }

      // AI call
      const result = await updateUserProfile({
        triggerSource: source,
        recentDumpContent: dumpContent,
        recentDiaryEntries: diaryEntries.slice(0, 5).map(d => ({
          content: d.content,
          mood: d.mood ?? 'neutral',
          timestamp: d.timestamp,
        })),
        categoryStats: Object.fromEntries(
          Object.entries(categoryStats).map(([k, v]) => [k, { total: v.total, completed: v.completed }])
        ),
        currentObservations: {
          identityNotes: persona.aiObservations?.identityNotes ?? '',
          goalDriftNote: persona.aiObservations?.goalDriftNote ?? '',
          insights: (persona.aiObservations?.insights ?? []).map(i => ({ text: i.text, generatedAt: i.generatedAt })),
        },
        persona: {
          longTermGoals: persona.longTermGoals,
          jobTitle: persona.jobTitle,
          values: persona.values ?? [],
        },
      });

      const existingInsights = persona.aiObservations?.insights ?? [];
      const updatedInsights = result
        ? [{ text: result.newInsight, generatedAt: Date.now(), source }, ...existingInsights].slice(0, 10)
        : existingInsights;

      const updatedObservations: UserPersona['aiObservations'] = {
        insights: updatedInsights,
        identityNotes: result?.identityNotes ?? persona.aiObservations?.identityNotes ?? '',
        goalDriftNote: result?.goalDriftNote ?? persona.aiObservations?.goalDriftNote ?? '',
        lastUpdatedAt: Date.now(),
        dumpsAtLastUpdate: memories.length,
        journalsAtLastUpdate: diaryEntries.length,
      };

      const updatedPersona: UserPersona = {
        ...persona,
        behavioralPatterns: updatedBehavioral,
        moodTrends: updatedMoodTrends,
        aiObservations: updatedObservations,
        lastUpdated: Date.now(),
      };

      setPersona(updatedPersona);
      databaseService.savePersona(updatedPersona);
    } catch (e) {
      console.warn('Profile update failed silently', e);
    } finally {
      isRunningRef.current = false;
    }
  }, [memories, diaryEntries, persona, setPersona]);

  const triggerAfterDump = useCallback((content: string) => {
    runUpdate('dump', content);
  }, [runUpdate]);

  const triggerAfterJournal = useCallback(() => {
    runUpdate('journal');
  }, [runUpdate]);

  const triggerAfterTaskCompletion = useCallback(() => {
    runUpdate('task');
  }, [runUpdate]);

  return { triggerAfterDump, triggerAfterJournal, triggerAfterTaskCompletion };
}
