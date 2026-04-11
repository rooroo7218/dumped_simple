import { ActionItem, MemoryItem } from '../types';

const URGENCY_WEIGHT = 0.70;
const ALIGNMENT_WEIGHT = 0.30;

/**
 * Normalizes alignmentScore to a 0–1 value.
 * Gemini returns 0–100, but some older stored values may be 0–10.
 * Heuristic: any value > 10 is treated as 0–100 scale.
 */
export function normalizeAlignment(score: number | undefined): number {
    if (!score) return 0;
    return score > 10 ? score / 100 : score / 10;
}

/**
 * Returns the effective urgency (1–10) after applying a deadline proximity bump.
 * The stored urgency value is never mutated — this is computed at display time only.
 */
export function getDeadlineBump(deadline: number | undefined, baseUrgency: number): number {
    if (!deadline) return baseUrgency;
    const hoursUntil = (deadline - Date.now()) / (1000 * 3600);
    let bump = 0;
    if (hoursUntil < 0)        bump = 4; // overdue
    else if (hoursUntil < 24)  bump = 3; // due today
    else if (hoursUntil < 72)  bump = 2; // 1–3 days
    else if (hoursUntil < 168) bump = 1; // 3–7 days
    return Math.min(10, baseUrgency + bump);
}

/**
 * Returns effective urgency for a task, factoring in deadline proximity.
 */
export function getEffectiveUrgency(task: ActionItem): number {
    return getDeadlineBump(task.deadline, task.urgency);
}

/**
 * Boosts tasks the user keeps thinking about.
 * Counts memories from the last 14 days whose category or content overlap with
 * this task (excluding the task's own parent memory). More mentions = more
 * top-of-mind = higher score.
 * Returns an additive value: 0 | 0.05 | 0.10
 */
export function getFrequencyBoost(task: ActionItem, memories: MemoryItem[]): number {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = memories.filter(m => m.timestamp > cutoff);
    const keywords = task.text.toLowerCase().split(/\W+/).filter(w => w.length >= 4);
    let count = 0;
    for (const m of recent) {
        if (task.memoryId && m.id === task.memoryId) continue;
        const catMatch = m.category?.toLowerCase() === task.category?.toLowerCase();
        const kwMatch = keywords.some(kw => m.content.toLowerCase().includes(kw));
        if (catMatch || kwMatch) count++;
    }
    if (count >= 4) return 0.10;
    if (count >= 2) return 0.05;
    return 0;
}

/**
 * Returns the current time-of-day slot based on system clock.
 * morning: 5am–12pm | afternoon: 12pm–6pm | evening: 6pm–11pm | night: 11pm–5am
 */
export function getCurrentTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 23) return 'evening';
    return 'night';
}

/**
 * Returns a time-of-day score bonus (+4 match, -2 mismatch, 0 anytime/unset).
 * Tasks scored at night get a neutral result regardless of their label.
 */
export function getTimeOfDayBonus(task: ActionItem): number {
    if (!task.timeOfDay || task.timeOfDay === 'anytime') return 0;
    const current = getCurrentTimeSlot();
    if (current === 'night') return 0; // No penalty late at night
    if (task.timeOfDay === current) return 4;
    // Adjacent slots get a small penalty; opposite gets a larger one
    const order = ['morning', 'afternoon', 'evening'];
    const taskIdx = order.indexOf(task.timeOfDay);
    const currIdx = order.indexOf(current);
    if (taskIdx === -1 || currIdx === -1) return 0;
    return Math.abs(taskIdx - currIdx) === 1 ? -1 : -2;
}

/**
 * Returns a composite 0–1 score combining urgency (70%) and goal alignment (30%).
 * Uses effective urgency so deadline proximity feeds into the composite.
 * Optionally accepts memories to apply a frequency-of-mention boost.
 */
export function getEffectiveCompositeScore(task: ActionItem, memories?: MemoryItem[]): number {
    const urgencyNorm = getEffectiveUrgency(task) / 10;
    const alignNorm = normalizeAlignment(task.alignmentScore);
    const base = urgencyNorm * URGENCY_WEIGHT + alignNorm * ALIGNMENT_WEIGHT;
    const boost = memories ? getFrequencyBoost(task, memories) : 0;
    return Math.min(1, base + boost);
}
