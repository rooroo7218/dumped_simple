import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export { SchemaType };

// ── Clients ───────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_URL = process.env.SUPABASE_URL;
const DB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const ai = GEMINI_API_KEY 
    ? new GoogleGenerativeAI(GEMINI_API_KEY) 
    : null;

const redis = (REDIS_URL && REDIS_TOKEN) 
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) 
    : null;

const ratelimit = redis 
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'dumped:ratelimit',
    }) 
    : null;

export async function checkRateLimit(userId: string, res: VercelResponse): Promise<boolean> {
    if (!ratelimit) {
        console.warn('⚠️ [Config] UPSTASH_REDIS_REST_URL/TOKEN missing. Rate limiting is disabled.');
        return true;
    }
    const { success } = await ratelimit.limit(userId);
    if (!success) {
        res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
        return false;
    }
    return true;
}

export const supabaseAdmin = (DB_URL && DB_SERVICE_KEY)
    ? createClient(DB_URL, DB_SERVICE_KEY)
    : null;

function verifyConfig() {
    if (!ai) throw new Error('Missing GEMINI_API_KEY');
    if (!supabaseAdmin) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

// ── System Prompt ─────────────────────────────────────────────────────────────

export const ASSISTANT_INSTRUCTION = `You are a supportive, wise, and trusted friend.
Your tone is conversational, encouraging, and warm.
You help the user stay organized by making helpful suggestions and breaking big ideas into small, manageable steps.
Your priority is to help the user align their daily life with what truly matters to them.
Avoid militaristic, overly technical, or intense jargon.
Address the user naturally as "you" and maintain a friendly, personal connection.`;

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function verifyAuth(req: VercelRequest): Promise<string> {
    verifyConfig();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Unauthorized: no token provided');
    const { data: { user }, error } = await supabaseAdmin!.auth.getUser(token);
    if (error || !user) throw new Error('Unauthorized: invalid token');
    return user.id;
}

// ── AI Utilities ──────────────────────────────────────────────────────────────

export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = 2,
    delay = 1000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        const status = error?.status || error?.response?.status;
        const isRetryable = status === 429 || status === 503 || error?.message?.includes('429');
        if (retries === 0 || !isRetryable) throw error;
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const waitTime = Math.max(500, delay + jitter);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return retryWithBackoff(operation, retries - 1, delay * 2);
    }
}

const PRIMARY_MODEL = 'models/gemini-flash-latest';
const FALLBACK_MODEL = 'models/gemini-pro-latest';

export async function generateWithFallback(config: any, payload: any): Promise<any> {
    verifyConfig();
    let currentModelName = PRIMARY_MODEL;
    try {
        const model = ai!.getGenerativeModel({ ...config, model: currentModelName });
        const result = await retryWithBackoff(() => model.generateContent(payload), 2, 1000);
        return result;
    } catch (error: any) {
        console.error(`❌ [AI] ${currentModelName} failed:`, error.message);
        
        const isQuota = error.status === 429 || error.message?.includes('429');
        const isUnavailable = error.status === 503 || error.message?.includes('404') || error.message?.includes('not found');
        
        if (isQuota || isUnavailable) {
            currentModelName = FALLBACK_MODEL;
            console.log(`🔄 [AI] Falling back to ${currentModelName}...`);
            const fallback = ai!.getGenerativeModel({ ...config, model: currentModelName });
            return await retryWithBackoff(() => fallback.generateContent(payload), 1, 2000);
        }
        throw error;
    }
}

export async function extractText(response: any): Promise<string> {
    let text = '';
    try {
        if (typeof response.text === 'function') {
            text = await response.text();
        } else if (typeof response.text === 'string') {
            text = response.text;
        } else if (response.candidates?.[0]?.content?.parts) {
            text = response.candidates[0].content.parts.map((p: any) => p.text || '').join('');
        }
    } catch {
        if (response.candidates?.[0]?.content?.parts) {
            text = response.candidates[0].content.parts.map((p: any) => p.text || '').join('');
        }
    }
    // Strip markdown code fences
    text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```[a-z]*\s*/i, '');
    if (text.endsWith('```')) text = text.replace(/\s*```$/i, '');
    return text.trim();
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

export async function fetchUserContext(userId: string, personaOverride: any = null) {
    verifyConfig();
    try {
        const [authRes, dbMemories, dbProfile] = await Promise.all([
            supabaseAdmin!.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
            supabaseAdmin!.from('memories').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(20),
            supabaseAdmin!.from('profiles').select('*').eq('user_id', userId).maybeSingle()
        ]);

        const user = (authRes as any).data?.user;
        const memoriesData = (dbMemories as any).data || [];
        const legacyProfile = (dbProfile as any).data;
        const profileDataFromMeta = user?.user_metadata?.persona_v1 || {};
        const profileData = { ...legacyProfile, ...profileDataFromMeta };

        const persona = personaOverride || {
            writingStyle: profileData.writingStyle || profileData.writing_style || 'Casual',
            thoughtProcess: profileData.thoughtProcess || profileData.thought_process || 'Analytical',
            values: profileData.values_list || profileData.values || [],
            speakingNuances: profileData.speakingNuances || profileData.speaking_nuances || [],
            age: profileData.age || 30,
            jobTitle: profileData.jobTitle || profileData.career || 'User',
            incomeLevel: profileData.incomeLevel || profileData.income_level || 'Medium',
            maritalStatus: profileData.maritalStatus || profileData.marital_status || 'Single',
            lifestyle: profileData.lifestyle || 'Active',
            longTermGoals: profileData.longTermGoals || profileData.long_term_goals || [],
            coreValues: profileData.coreValues || profileData.core_values || [],
            customCategories: profileData.customCategories || [],
            productivityPatterns: profileData.productivityPatterns || {},
            currentConstraints: profileData.currentConstraints || [],
        };

        const history = memoriesData.map((m: any) => ({
            category: m.category,
            content: m.content,
            priority: m.priority,
            actions: [],
        }));

        return { persona, history };
    } catch {
        return {
            persona: personaOverride || { writingStyle: 'Casual', longTermGoals: [], coreValues: [] },
            history: [],
        };
    }
}

export function getTimeContext(): string {
    const hour = new Date().getHours();
    const timeLabel = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const timeStr = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
    const hints: Record<string, string> = {
        morning: 'ideal for deep focus and cognitively demanding tasks',
        afternoon: 'better for meetings, admin, errands, and collaborative work',
        evening: 'suited for lighter tasks, planning, and creative reflection',
        night: 'best for very low-effort tasks, reviewing lists, or rest — avoid scheduling demanding work',
    };
    return `Current time: ${timeStr} (${timeLabel}). Time-of-day context: ${hints[timeLabel]}.`;
}

export async function fetchUserTasks(userId: string) {
    verifyConfig();
    const { data: actions } = await supabaseAdmin!
        .from('actions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false);

    return (actions || []).map((a: any) => ({
        id: a.id,
        text: a.text,
        urgency: a.urgency,
        effort: a.effort,
        category: a.category,
        rationale: a.rationale,
        completed: a.completed,
        alignmentScore: a.alignment_score,
        impactArea: a.impact_area,
        contextTags: a.context_tags || [],
    }));
}
