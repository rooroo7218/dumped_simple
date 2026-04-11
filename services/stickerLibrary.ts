import { Sticker, StickerRarity } from '../types';

export const STICKER_COLLECTION: Sticker[] = [
    { id: 'early-bird', name: 'Early Bird', emoji: '🌅', description: "Up and at 'em! Completed a task early.", style: 'stamp' },
    { id: 'focus-expert', name: 'Focus Expert', emoji: '🧘', description: 'Stayed in the zone for a long session.', style: 'jelly' },
    { id: 'task-crusher', name: 'Task Crusher', emoji: '🔨', description: 'Knocking items off the list with ease.', style: 'stamp' },
    { id: 'quick-win', name: 'Quick Win', emoji: '⚡', description: 'Handled that lightning fast!', style: 'jelly' },
    { id: 'slay', name: 'Slay', emoji: '💅', description: 'Absolutely slayed that task.', style: 'jelly' },
    { id: 'no-cap', name: 'No Cap', emoji: '🧢', description: "No cap, you're crushing it.", style: 'stamp' },
    { id: 'skull', name: 'Skull', emoji: '💀', description: "Productivity so good, you're dead.", style: 'jelly' },
    { id: 'vibe-check', name: 'Vibe Check', emoji: '🌈', description: 'Vibe check passed. Mission complete.', style: 'jelly' },
    { id: 'periodt', name: 'Periodt', emoji: '💍', description: "And that's on periodt.", style: 'stamp' },
    { id: 'tea', name: 'Tea', emoji: '☕', description: 'Spilled the tea on that project.', style: 'stamp' },
    { id: 'bet', name: 'Bet', emoji: '🤝', description: 'Bet. Handled.', style: 'stamp' },
    { id: 'sus', name: 'Sus', emoji: '🤨', description: 'Suspiciously fast completion.', style: 'jelly' },
    { id: 'main-character', name: 'Main Character', emoji: '👑', description: 'Main character energy only.', style: 'stamp' },
    { id: 'it-is-giving', name: 'It\'s Giving', emoji: '✨', description: "It's giving productivity.", style: 'jelly' },
    { id: 'rizz', name: 'Rizz', emoji: '🔥', description: 'Task rizz off the charts.', style: 'jelly' },
    { id: 'delulu', name: 'Delulu', emoji: '🦄', description: 'Delulu is the solulu.', style: 'jelly' },
    { id: 'stan', name: 'Stan', emoji: '💖', description: 'We stan an efficient legend.', style: 'jelly' },
    { id: 'bestie', name: 'Bestie', emoji: '👯', description: 'Bestie, you did it.', style: 'stamp' },
    { id: 'lowkey', name: 'Lowkey', emoji: '🤫', description: 'Lowkey proud of this win.', style: 'jelly' },
    { id: 'highkey', name: 'Highkey', emoji: '📣', description: 'Highkey impressed by you.', style: 'jelly' },
    { id: 'era', name: 'Era', emoji: '🌸', description: 'In your productivity era.', style: 'stamp' },
    { id: 'soft-life', name: 'Soft Life', emoji: '☁️', description: 'Living the soft life now.', style: 'jelly' },
    { id: 'coded', name: 'Coded', emoji: '💻', description: 'Success is literally coded into you.', style: 'stamp' },
    { id: 'based', name: 'Based', emoji: '🗿', description: 'Based and task-pilled.', style: 'jelly' },
    { id: 'fr', name: 'Fr Fr', emoji: '💯', description: 'For real, for real.', style: 'jelly' },
    { id: 'on-god', name: 'On God', emoji: '🙏', description: "On god, you're too fast.", style: 'jelly' },
    { id: 'situationship', name: 'Situationship', emoji: '💔', description: 'That task was a whole situationship.', style: 'stamp' },
    { id: 'simp', name: 'Simp', emoji: '🥺', description: 'Simping for your work ethic.', style: 'jelly' },
    { id: 'ghosted', name: 'Ghosted', emoji: '👻', description: 'Ghosted the backlog.', style: 'jelly' },
    { id: 'left-on-read', name: 'Left on Read', emoji: '📱', description: 'Left the obstacles on read.', style: 'stamp' },
    { id: 'girlboss', name: 'Girlboss', emoji: '💼', description: 'Gaslight, Gatekeep, Girlboss.', style: 'stamp' },
    { id: 'rent-free', name: 'Rent Free', emoji: '🏠', description: 'Success living rent-free in your head.', style: 'stamp' },
    { id: 'sheesh', name: 'Sheesh', emoji: '🥶', description: 'Sheesh! Cold blooded worker.', style: 'jelly' },
    { id: 'bussin', name: 'Bussin', emoji: '🍔', description: 'Internal flow is absolutely bussin.', style: 'stamp' }
];

export function getRandomSticker(): Sticker {
    const randomIndex = Math.floor(Math.random() * STICKER_COLLECTION.length);
    return STICKER_COLLECTION[randomIndex];
}

export function getRandomRarity(): StickerRarity {
    const roll = Math.random() * 100;
    if (roll < 5) return 'holographic';  // 5% chance
    if (roll < 15) return 'legendary';   // 10% chance
    if (roll < 40) return 'rare';        // 25% chance
    return 'common';                     // 60% chance
}
