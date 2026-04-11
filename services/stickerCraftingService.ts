import { UserSticker, StickerRarity, CraftingRecipe } from '../types';
import { STICKER_COLLECTION, getRandomSticker } from './stickerLibrary';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
    {
        id: 'queen-recipe',
        name: 'The Queen',
        description: 'Combine the Slay, Periodt, and Era stickers to manifest ultimate power.',
        ingredients: [
            { stickerId: 'slay', count: 1 },
            { stickerId: 'periodt', count: 1 },
            { stickerId: 'era', count: 1 }
        ],
        resultStickerId: 'main-character',
        resultRarity: 'legendary'
    },
    {
        id: 'vibes-recipe',
        name: 'Vibe Master',
        description: 'Vibe Check + Soft Life + Lowkey = Pure Peace.',
        ingredients: [
            { stickerId: 'vibe-check', count: 1 },
            { stickerId: 'soft-life', count: 1 },
            { stickerId: 'lowkey', count: 1 }
        ],
        resultStickerId: 'stan',
        resultRarity: 'rare'
    }
];

export function craftStickers(selectedStickers: UserSticker[]): { success: boolean, result?: Partial<UserSticker>, message: string } {
    if (selectedStickers.length !== 3) {
        return { success: false, message: 'You need exactly 3 stickers to craft!' };
    }

    // Check for specific recipes
    const selectedIds = selectedStickers.map(s => s.stickerId).sort();
    for (const recipe of CRAFTING_RECIPES) {
        const recipeIds = recipe.ingredients.flatMap(ing => Array(ing.count).fill(ing.stickerId)).sort();
        if (JSON.stringify(selectedIds) === JSON.stringify(recipeIds)) {
            return {
                success: true,
                result: {
                    stickerId: recipe.resultStickerId,
                    rarity: recipe.resultRarity,
                },
                message: `Success! You crafted: ${recipe.name}`
            };
        }
    }

    // If no specific recipe, check for rarity-based upgrade
    const rarities = selectedStickers.map(s => s.rarity);
    const allSameRarity = rarities.every(r => r === rarities[0]);

    if (allSameRarity) {
        const currentRarity = rarities[0];
        let nextRarity: StickerRarity = 'common';

        if (currentRarity === 'common') nextRarity = 'rare';
        else if (currentRarity === 'rare') nextRarity = 'legendary';
        else if (currentRarity === 'legendary') nextRarity = 'holographic';
        else if (currentRarity === 'holographic') nextRarity = 'holographic'; // Cap at holographic

        const newBase = getRandomSticker();
        return {
            success: true,
            result: {
                stickerId: newBase.id,
                rarity: nextRarity as any
            },
            message: `Generic Craft Success! Upgraded to ${nextRarity}`
        };
    }

    return { success: false, message: 'No recipe found and rarities do not match!' };
}
