import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : '*';
app.use(cors({
    origin: allowedOrigins
}));
app.use(express.json({ limit: '50mb' })); // Increased limits

// Root Route for Health/Status
app.get('/', (req, res) => {
    res.send('🧠 Brain Dump API Server is running locally on port ' + port);
});

// Initialize Google AI
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SchemaTypeRef = SchemaType; // Alias for easier replacement below if needed, or just use SchemaType directly

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// System Prompts
const ASSISTANT_INSTRUCTION = `You are a supportive, wise, and trusted friend. 
Your tone is conversational, encouraging, and warm. 
You help the user stay organized by making helpful suggestions and breaking big ideas into small, manageable steps.
Your priority is to help the user align their daily life with what truly matters to them.
Avoid militaristic, overly technical, or intense jargon.
Address the user naturally as "you" and maintain a friendly, personal connection.`;

// Utility: Retry Logic with Exponential Backoff and Jitter
async function retryWithBackoff(operation, retries = 2, delay = 1000) {
    try {
        return await operation();
    } catch (error) {
        const status = error?.status || error?.response?.status;
        const isRetryable = status === 429 || status === 503 || error?.message?.includes('429');

        if (retries === 0 || !isRetryable) throw error;

        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const waitTime = Math.max(500, delay + jitter);

        console.warn(`⚠️ Gemini API ${status || 'Error'}. Retrying in ${Math.round(waitTime)}ms... (${retries} attempts left)`);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        return retryWithBackoff(operation, retries - 1, delay * 2.0);
    }
}

// Strategy 4: Local Ollama Fallback
async function generateWithOllama(prompt, systemInstruction, responseSchema) {
    const url = process.env.OLLAMA_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL || "llama3";

    console.log(`🏠 [Local AI] Using Ollama Model: ${model}`);

    try {
        const fullPrompt = `${systemInstruction}\n\n${prompt}`;

        const response = await fetch(`${url}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: fullPrompt,
                stream: false,
                format: "json", // Ollama 0.1.20+ supports "json" format
                options: {
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama failed with status ${response.status}`);
        }

        const data = await response.json();
        return {
            response: {
                text: () => data.response
            }
        };
    } catch (error) {
        console.error("❌ [Local AI] Ollama Error:", error.message);
        throw error;
    }
}

// Strategy 2: Model Fallback & Strategy 3: DSQ Models
// Wrapper to try primary model then fallback to secondary, then finally local Ollama
async function generateAIContentWithFallback(aiInstance, config, payload) {
    const PRIMARY_MODEL = "gemini-2.0-flash"; // Strongest & Fastest
    const FALLBACK_MODEL = "gemini-1.5-flash"; // Stable and highly available fallback

    const preferLocal = process.env.PREFER_LOCAL_AI === 'true';
    const localOnly = process.env.USE_LOCAL_AI_ONLY === 'true';

    // Helper to run local Ollama
    const runLocal = async () => {
        const parts = payload.contents?.[0]?.parts || [];
        const prompt = parts.map(p => p.text).join("\n");
        const systemInstruction = config.systemInstruction || ASSISTANT_INSTRUCTION;
        return await generateWithOllama(prompt, systemInstruction, config.generationConfig?.responseSchema);
    };

    if (localOnly) {
        return await runLocal();
    }

    if (preferLocal) {
        try {
            return await runLocal();
        } catch (e) {
            console.warn("🏠 [Local AI] Failed, falling back to Gemini...", e.message);
        }
    }

    try {
        console.log(`🤖 [AI] Using Primary Model: ${PRIMARY_MODEL}`);
        const model = aiInstance.getGenerativeModel({
            ...config,
            model: PRIMARY_MODEL
        });

        return await retryWithBackoff(() => model.generateContent(payload), 2, 1000);
    } catch (error) {
        const isQuota = error.status === 429 || error.message?.includes('429');
        const isUnavailable = error.status === 503 || error.message?.includes('503');

        if (isQuota || isUnavailable) {
            try {
                console.warn(`🔄 [AI Fallback] Primary Model issues. Trying Fallback: ${FALLBACK_MODEL}`);
                const fallbackModel = aiInstance.getGenerativeModel({
                    ...config,
                    model: FALLBACK_MODEL
                });
                return await retryWithBackoff(() => fallbackModel.generateContent(payload), 1, 2000);
            } catch (fallbackError) {
                console.warn(`🏠 [AI Fallback] Gemini issues. Attempting Local Ollama...`);
                return await runLocal();
            }
        }

        throw error;
    }
}

// Utility: Robust Text Extraction for both old and new SDKs
async function extractGeminiText(response) {
    if (!response) return "";
    let text = "";
    try {
        // Log structure found for debugging
        if (response.candidates?.[0]?.content?.parts) {
            console.log(`📡 [AI Extraction] Found ${response.candidates[0].content.parts.length} parts in candidate 0`);
        }

        // Handle Gemini 2.0 SDK (extract text directly or via candidate)
        if (typeof response.text === 'function') {
            text = await response.text();
        } else if (typeof response.text === 'string') {
            text = response.text;
        } else if (response.candidates && response.candidates[0]?.content?.parts) {
            // Join all parts (sometimes it's split)
            text = response.candidates[0].content.parts
                .map(part => part.text || "")
                .join("");
        }
    } catch (e) {
        console.warn("⚠️ Response text extraction failed, falling back to manual part join...", e.message);
        if (response.candidates && response.candidates[0]?.content?.parts) {
            text = response.candidates[0].content.parts
                .map(part => part.text || "")
                .join("");
        }
    }

    if (text) {
        // Remove markdown backticks (e.g. ```json ... ```)
        text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
        // Also handle cases where backticks are on the same line
        if (text.startsWith('```')) text = text.replace(/^```[a-z]*\s*/i, '');
        if (text.endsWith('```')) text = text.replace(/\s*```$/i, '');
    }

    return text.trim();
}

// Utility: Fetch User Context
async function fetchUserContext(userId, personaOverride = null) {
    if (!userId) throw new Error("User ID is required");

    // Fetch User from Auth (for Metadata) and Memories from DB
    let user = null;
    let memoriesRes = { data: [] };

    try {
        const [authRes, dbMemories, dbProfile] = await Promise.all([
            supabase.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
            supabase.from('memories').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(20),
            supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
        ]);
        user = authRes.data?.user;
        memoriesRes = dbMemories;
        const legacyProfile = dbProfile?.data;

        const profileDataFromMeta = user?.user_metadata?.persona_v1 || {};

        // Merge Meta with Legacy Fallback
        const profileData = {
            ...legacyProfile,
            ...profileDataFromMeta
        };

        console.log(`👤 fetched persona for ${userId}:`, {
            source: user?.user_metadata?.persona_v1 ? 'Metadata' : (legacyProfile ? 'Profiles Table' : 'Default'),
            goalCount: profileData.longTermGoals?.length || profileData.long_term_goals?.length || 0
        });

        const persona = personaOverride || {
            writingStyle: profileData.writingStyle || profileData.writing_style || "Casual",
            thoughtProcess: profileData.thoughtProcess || profileData.thought_process || "Analytical",
            values: profileData.values_list || profileData.values || [],
            speakingNuances: profileData.speakingNuances || profileData.speaking_nuances || [],
            age: profileData.age || 30,
            jobTitle: profileData.jobTitle || profileData.career || "User",
            incomeLevel: profileData.incomeLevel || profileData.income_level || "Medium",
            maritalStatus: profileData.maritalStatus || profileData.marital_status || "Single",
            lifestyle: profileData.lifestyle || "Active",
            longTermGoals: profileData.longTermGoals || profileData.long_term_goals || [],
            coreValues: profileData.coreValues || profileData.core_values || []
        };

        // Format History for Prompt
        const history = (memoriesRes.data || []).map(m => ({
            category: m.category,
            content: m.content,
            priority: m.priority,
            actions: []
        }));

        return { persona, history };
    } catch (e) {
        console.warn("⚠️ Database/Auth fetch failed (likely Tester Mode):", e.message);
        return {
            persona: personaOverride || { writingStyle: "Casual", longTermGoals: [], coreValues: [] },
            history: []
        };
    }
}

// Utility: Fetch User Tasks
async function fetchUserTasks(userId) {
    if (!userId) throw new Error("User ID is required");
    const { data: actions } = await supabase.from('actions').select('*').eq('user_id', userId).eq('completed', false);
    return (actions || []).map(a => ({
        id: a.id,
        text: a.text,
        urgency: a.urgency,
        effort: a.effort,
        category: a.category,
        rationale: a.rationale,
        completed: a.completed,
        alignmentScore: a.alignment_score,
        impactArea: a.impact_area,
        contextTags: a.context_tags || []
    }));
}

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------

// POST /api/gemini/brain-dump
app.post('/api/gemini/brain-dump', async (req, res) => {
    try {
        // Client sends userId now. Input is optional (image might be there).
        const { userId, input, imageAttachment } = req.body;
        // 1. Fetch Context from DB (with potential override from client)
        const { persona } = await fetchUserContext(userId, req.body.persona);

        const isImageOnly = (!input || !input.trim()) && !!imageAttachment;
        console.log(`🔹 [Brain Dump] Mode: ${isImageOnly ? 'Image-Only' : 'Text/Mixed'}`);

        const promptText = isImageOnly
            ? `TASK: EXTRACT EVERY SINGLE ACTIONABLE ITEM from the attached image.
         - The user has uploaded an image of notes, lists, or a whiteboard.
         - READ EVERY LINE. Do not summarize.
         - If text is semi-legible, take your best guess but include it.
         - Every distinct item must be its own task object.`
            : `USER INPUT: "${input}"
         
         TASK: You MUST extract at least one actionable task from this input.
         - If the input is short ("take out trash"), extract exactly that.
         - If the input is a mess of thoughts, separate them into 2-5 distinct tasks.
         - DO NOT RETURN AN EMPTY LIST. If the user said anything, it's a task.`;

        const parts = [{
            text: `${promptText}
      
      ABOUT THIS USER:
      - Role/Identity: ${persona.jobTitle || 'Not specified'}
      - Peak energy window: ${persona.productivityPatterns?.peakEnergyTime || 'Not specified'}
      - Daily focused time available: ${persona.productivityPatterns?.focusType || 'Not specified'}
      - Life focus areas: ${(persona.customCategories || persona.values || []).join(', ')}
      - Goals (ranked by importance): ${(persona.longTermGoals || []).map(g => `"${g.goal}" (priority ${g.priority}/10)`).join('; ') || 'None set'}
      - Core values: ${(persona.coreValues || []).map(v => v.value).join(', ') || 'None set'}
      - Current life constraints: ${(persona.currentConstraints || []).join(' | ') || 'None listed'}
      - What success looks like to them: "${persona.brutalistBackground || 'Not specified'}"

      USE THIS CONTEXT TO:
      - Assign higher urgency to tasks that serve higher-priority goals
      - Respect the user's available time — if they only have 2 hours/day, prioritise ruthlessly
      - Flag tasks blocked by their constraints (e.g. tasks requiring a car if they don't have one)
      - Tasks that move them toward their stated life vision should rank higher

      CRITICAL GUIDELINES:
      - EXTRACTION RESILIENCE: I strictly require that you return at least ONE task if the input contains any actionable intent (e.g., "reminder", "buy", "need to", "plan", etc.).
      - NO SUBTASKS: The user wants to capture the high-level thought. Breakdown happens later on demand.
      - ATOMIC TASKS: Keep tasks as high-level single items.
      - MEANINGFUL TEXT: Each action text must be clear and complete (e.g., "Buy milk" not just "Milk").
      - RATIONALE: Explain alignment with goals in 1 short sentence. If no clear goal match, explain why it's a valid general life task.
      - CATEGORIZE: Group into "Career", "Health", "Finance", "Household", or a new simple category.
      - CONTEXT TAGS: Assign 1-2 tags ONLY from this list. These represent WHERE and WHEN the task can be done (situational requirements):
         - "Need Car", "At Computer", "On Phone", "Around the House", "Low Mental Load"
      - If none apply perfectly, choose the closest single tag from the list above.`
        }];

        if (imageAttachment) {
            parts.unshift({ inlineData: { data: imageAttachment.data, mimeType: imageAttachment.mimeType } });
        }

        const result = await generateAIContentWithFallback(ai, {
            systemInstruction: ASSISTANT_INSTRUCTION,
        }, {
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        summary: { type: SchemaType.STRING },
                        actions: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    text: { type: SchemaType.STRING },
                                    urgency: { type: SchemaType.NUMBER },
                                    effort: { type: SchemaType.STRING },
                                    category: { type: SchemaType.STRING },
                                    rationale: { type: SchemaType.STRING },
                                    contextTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["text", "urgency", "effort", "category", "rationale", "contextTags"]
                            }
                        },
                        category: { type: SchemaType.STRING },
                        tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        priority: { type: SchemaType.STRING }
                    },
                    required: ["summary", "actions", "category", "tags", "priority"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        if (!text) {
            console.error("❌ [Brain Dump] Empty AI response.");
            throw new Error("AI returned no results. This might be a temporary model flicker.");
        }

        console.log(`📝 [Brain Dump] Raw AI Response: ${text.substring(0, 100)}...`);

        let parsed = { summary: "", actions: [], category: "General", tags: [], priority: "medium" };
        try {
            parsed = JSON.parse(text);
            if (!parsed.actions || !Array.isArray(parsed.actions)) {
                parsed.actions = [];
            }
        } catch (e) {
            console.warn("⚠️ [Brain Dump] Failed to parse AI JSON:", e.message);
            // Safety net will handle this since parsed.actions is empty
        }

        // --- SAFETY NET ---
        if (!parsed.actions || parsed.actions.length === 0) {
            console.log("🛡️ [Safety Net] AI returned zero tasks or invalid JSON. Forcing extraction fallback.");
            parsed.actions = [{
                text: (input && input.trim()) ? input.substring(0, 100) : "Captured thought from image/upload",
                urgency: 5,
                effort: "medium",
                category: "General",
                rationale: "Automated extraction fallback (AI was inconclusive).",
                contextTags: ["Auto-Extracted"]
            }];
            if (!parsed.summary) {
                parsed.summary = "I captured your thought directly since I wasn't sure how to break it down.";
            }
        }

        console.log(`✅ [Brain Dump] Returning ${parsed.actions.length} tasks.`);
        res.json(parsed);

    } catch (error) {
        console.error("❌ [Brain Dump Error]:", error);

        const isQuota = error.message?.includes('429') || error.message?.toLowerCase().includes('exhausted') || error.status === 429;
        const status = isQuota ? 429 : 500;
        const userMsg = isQuota
            ? "Gemini API Limit Reached. You're using the Free Tier (15 requests per minute). Please wait 1 minute before trying again."
            : `Server Error: ${error.message}`;

        res.status(status).json({
            error: isQuota ? "Quota Exceeded" : "Processing Failed",
            message: error.message,
            actions: [],
            summary: userMsg
        });
    }
});

// POST /api/gemini/synthesize
app.post('/api/gemini/synthesize', async (req, res) => {
    try {
        const { userId, persona: personaOverride } = req.body;
        const { persona, history } = await fetchUserContext(userId, personaOverride);

        const result = await generateAIContentWithFallback(ai, {
            systemInstruction: ASSISTANT_INSTRUCTION + "\nProvide a clear and helpful summary of the user's current progress and life balance. The 'synthesis' field should be a direct and encouraging report on their status.",
        }, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `Here is the current state of your tasks and life context:
            Persona: ${JSON.stringify(persona)}
            Logs & Memories: ${history.map(m => `[${m.category}] ${m.content} (Priority: ${m.priority})`).join('\n')}
            
            Based on this aggregate data, how are you doing? 
            1. THEMES: What are the recurring subjects in my life right now?
            2. ALIGNMENT: How well do current tasks align with my Long-Term Goals (${JSON.stringify(persona.longTermGoals)})?
            3. STRATEGIC REASONING: Explain how you perceived the importance of these tasks given the user's specific constraints and energy trends.
            4. SYNTHESIS: A direct and encouraging executive summary.`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        themes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        frictionPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        currentTrajectory: { type: SchemaType.STRING },
                        synthesis: { type: SchemaType.STRING },
                        strategicReasoning: { type: SchemaType.STRING }
                    },
                    required: ["themes", "frictionPoints", "currentTrajectory", "synthesis", "strategicReasoning"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        if (!text) throw new Error("Empty response from AI");

        console.log(`📝 [Synthesize] Raw AI Response (First 200 chars): ${text.substring(0, 200)}...`);
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("Synthesis Error:", error);
        res.status(500).json({ error: "Failed to synthesize context" });
    }
});

// POST /api/gemini/reprioritize
app.post('/api/gemini/reprioritize', async (req, res) => {
    try {
        const { userId, persona: personaOverride, tasks: tasksOverride, diaryEntries } = req.body;
        console.log(`🚀 [Reprioritize] Starting for user ${userId}`);

        const [context, dbTasks] = await Promise.all([
            fetchUserContext(userId, personaOverride),
            tasksOverride ? Promise.resolve(tasksOverride) : fetchUserTasks(userId)
        ]);
        const { persona, history } = context;
        const allTasks = tasksOverride || dbTasks;
        const recentContext = history.slice(0, 10);

        console.log(`📍 [Reprioritize] User Goals:`, JSON.stringify(persona.longTermGoals));
        console.log(`📍 [Reprioritize] Task Count: ${allTasks.length}`);

        const tasksForAi = allTasks.map(t => ({
            id: t.id,
            text: t.text,
            currentUrgency: t.urgency || 5,
            currentAlignment: t.alignmentScore || 0,
            category: t.category
        }));

        console.log(`🚀 Sending to Gemini: ${tasksForAi.length} tasks...`);

        const result = await generateAIContentWithFallback(ai, {
            systemInstruction: ASSISTANT_INSTRUCTION + "\nYou are a strategic advisor helping the user re-prioritize their life. You evaluate tasks against their long-term goals and recent life events.",
        }, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `TASK: Re-rank these tasks based on the provided USER context.
                    
                    USER GOALS (sorted by importance, 10 = Must-Win):
                    ${(persona.longTermGoals || []).sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(g => `- "${g.goal}" [priority ${g.priority}/10, ${g.timeframe}]`).join('\n')}

                    USER VALUES:
                    ${(persona.coreValues || []).map(v => `- ${v.value} (importance ${v.importance}/10): ${v.description || ''}`).join('\n')}

                    PRODUCTIVITY PROFILE:
                    - Peak energy window: ${persona.productivityPatterns?.peakEnergyTime || 'Not specified'}
                    - Daily focused time: ${persona.productivityPatterns?.focusType || 'Not specified'}

                    LIFE CONSTRAINTS (things the AI must respect):
                    ${(persona.currentConstraints || []).map(c => `- ${c}`).join('\n') || '- None listed'}

                    LIFE VISION (what success looks like to this user):
                    "${persona.brutalistBackground || 'Not specified'}"

                    CRITICAL INSTRUCTIONS:
                    - Goals with priority 10 are Must-Win. Tasks aligned with them get urgency 8–10.
                    - Tasks that directly move the user toward their life vision score higher.
                    - Respect daily time limits — if user has 2 hours/day, only 2–3 tasks should be urgency 8+.
                    - Tasks blocked by listed constraints should be deprioritised or noted in rationale.
                    - Peak energy window matters: deep-focus tasks should be marked for that window.

                    RECENT LIFE CONTEXT (Memories):
                    ${recentContext.map(m => `- [${m.category}] ${m.content} (Priority: ${m.priority})`).join('\n')}
                    
                    RECENT REFLECTIONS (Diary):
                    ${(diaryEntries || []).slice(0, 5).map(d => `- ${d.content}`).join('\n')}
                    
                    CURRENT TASKS:
                    ${JSON.stringify(tasksForAi)}
            
                    INSTRUCTIONS:
                    1. Assign an URGENCY (1-10) and ALIGNMENT SCORE (0-100) to each task.
                    2. WEIGHTING: Use the goal's "priority" to multiply the importance of related tasks.
                    3. If a task serves a Goal, ensure high alignment (0-100 scale). Scale alignment proportional to goal priority.
                    4. Use the "RECENT LIFE CONTEXT" to identify if certain areas (e.g., Health, Work) need more focus right now.
                    5. Return a "strategySummary" explaining your reasoning for the major shifts.
                    6. CONTEXT TAGS: Assign 1-2 tags ONLY from this list: ["Need Car", "At Computer", "On Phone", "Around the House", "Low Mental Load"].
                    7. CONTEXT DEFINITION: Contexts represent WHERE and WHEN a task can be performed.
                    8. LEGACY MIGRATION: If a task has an existing tag NOT in the list above, you MUST REPLACE it with the most appropriate one from the approved list.`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        strategySummary: { type: SchemaType.STRING },
                        updatedTasks: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    id: { type: SchemaType.STRING },
                                    urgency: { type: SchemaType.NUMBER },
                                    alignmentScore: { type: SchemaType.NUMBER },
                                    impactArea: { type: SchemaType.STRING },
                                    rationale: { type: SchemaType.STRING },
                                    contextTags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["id", "urgency", "alignmentScore", "impactArea", "rationale", "contextTags"]
                            }
                        }
                    },
                    required: ["strategySummary", "updatedTasks"]
                }
            }
        });

        const response = result.response;
        const candidate = response.candidates?.[0] || {};

        // FULL DIAGNOSTIC LOGGING - Reduced for production
        // console.log(`📡 [AI RAW RESPONSE]:`, JSON.stringify(response, null, 2));

        const text = await extractGeminiText(response);

        let parsed = { updatedTasks: [], strategySummary: "" };
        if (text) {
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                console.error("❌ Failed to parse AI JSON:", e.message);
            }
        }

        // Safety: Ensure strategySummary is never empty
        if (!parsed.strategySummary || parsed.strategySummary.trim() === "") {
            parsed.strategySummary = "Analyzed your current tasks against your strategic goals and core values to optimize your focus.";
        }

        console.log(`✅ Gemini returned ${parsed.updatedTasks?.length || 0} tasks. FinishReason: ${candidate.finishReason}`);

        res.json({
            ...parsed,
            rawText: text,
            debug: {
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings,
                citationMetadata: candidate.citationMetadata
            }
        });
    } catch (error) {
        console.error("Reprioritize Error:", error);
        res.status(500).json({ error: "Failed to reprioritize tasks", message: error.message });
    }
});

// POST /api/gemini/recommend
app.post('/api/gemini/recommend', async (req, res) => {
    try {
        const { userId, synthesis } = req.body;
        const tasks = await fetchUserTasks(userId);

        const result = await generateAIContentWithFallback(ai, {}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `Current Tasks: ${JSON.stringify(tasks)} 
            Status Summary: ${JSON.stringify(synthesis)}
            Which three tasks should we focus on this week to keep things moving forward?`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        recommendations: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    taskId: { type: SchemaType.STRING },
                                    rationale: { type: SchemaType.STRING },
                                    impactScore: { type: SchemaType.NUMBER },
                                    estimatedMinutes: { type: SchemaType.NUMBER },
                                    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                                },
                                required: ["taskId", "rationale", "impactScore", "estimatedMinutes", "steps"]
                            }
                        }
                    },
                    required: ["recommendations"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("Recommend Error:", error);
        res.status(500).json({ error: "Failed to recommend priorities" });
    }
});

// POST /api/gemini/breakdown
app.post('/api/gemini/breakdown', async (req, res) => {
    try {
        const { userId, task, persona: personaOverride } = req.body;
        const { persona } = await fetchUserContext(userId, personaOverride);

        const result = await generateAIContentWithFallback(ai, {}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `GOAL: "${task.text}"
            CATEGORY: ${task.category}
            YOUR CONTEXT: ${JSON.stringify(persona)}
            
            Please provide a simple breakdown for this goal. 
            I need 3 - 5 clear, executable steps that you can finish in one sitting.
    
            GUIDELINES:
            1. Steps must be specific and direct.
            2. Durations should be realistic chunks between 15 and 90 minutes.
            3. The breakdown should be written in plain English.
            
            Format the response as JSON with an array of objects containing 'text' and 'durationMinutes'.`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        steps: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    text: { type: SchemaType.STRING },
                                    durationMinutes: { type: SchemaType.NUMBER }
                                },
                                required: ["text", "durationMinutes"]
                            }
                        }
                    },
                    required: ["steps"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        const data = JSON.parse(text);
        const steps = (data.steps || []).map(s => ({
            id: crypto.randomUUID(),
            completed: false,
            text: s.text,
            durationMinutes: s.durationMinutes
        }));

        res.json({ steps });
    } catch (error) {
        console.error("Breakdown Error:", error);
        res.status(500).json({ error: "Failed to break down task" });
    }
});

// POST /api/gemini/coach
app.post('/api/gemini/coach', async (req, res) => {
    try {
        const { userId, messages, persona: personaOverride } = req.body;
        const [context, tasks] = await Promise.all([
            fetchUserContext(userId, personaOverride),
            fetchUserTasks(userId)
        ]);
        const { persona } = context;
        const lastUserMsg = messages[messages.length - 1].text;

        const result = await generateAIContentWithFallback(ai, {}, {
            contents: [
                {
                    role: 'user',
                    parts: [{
                        text: `User Persona: ${JSON.stringify(persona)}
              Active Tasks: ${JSON.stringify(tasks)}
              
              Conversation History:
              ${messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
              
              LATEST USER MESSAGE: "${lastUserMsg}"
              
              Please act as a strategic life coach. Listen to the user, provide supportive advice, and if it makes sense, suggest specific updates to their task list. 
              For example, increasing urgency for a health goal if they are stressed, or moving a work task to a different category.
              
              You MUST respond in JSON format with two fields:
              1. "advice": A supportive, direct, and conversational text response in plain English.
              2. "suggestions": An optional array of objects, each containing:
                 - "taskId": The ID of the task to update.
                 - "updates": An object with fields to change (e.g., { "urgency": 8, "category": "Health" }).
                 - "rationale": A brief explanation for this specific suggestion.`
                    }]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        advice: { type: SchemaType.STRING },
                        suggestions: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    taskId: { type: SchemaType.STRING },
                                    updates: { type: SchemaType.OBJECT },
                                    rationale: { type: SchemaType.STRING }
                                },
                                required: ["taskId", "updates", "rationale"]
                            }
                        }
                    },
                    required: ["advice"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("Coach Error:", error);
        res.status(500).json({ error: "Failed to get coach response" });
    }
});

// POST /api/gemini/duplicates
app.post('/api/gemini/duplicates', async (req, res) => {
    try {
        const { userId, tasks: tasksOverride } = req.body;
        const allTasks = tasksOverride || await fetchUserTasks(userId);

        if (allTasks.length < 2) return res.json({ duplicateGroups: [] });

        console.log(`🔍 [Duplicates] Checking ${allTasks.length} tasks for user ${userId}`);

        // Log to file for debugging
        fs.appendFileSync('server_logs.txt', `[${new Date().toISOString()}] Duplicates check for ${userId}: ${allTasks.length} tasks\n`);

        const result = await generateAIContentWithFallback(ai, {}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `You are an expert at semantic deduplication. 
            Analyze the following tasks and identify pairs or groups that are semantically identical or highly similar in intent.
            
            TASKS:
            ${JSON.stringify(allTasks.map(t => ({
                        id: t.id,
                        text: t.text,
                        category: t.category,
                        context: t.contextTags?.join(', ') || ''
                    })))}
            
            RULES:
            1. Look for tasks that have the same goal and context, even if worded differently (e.g., "Buy milk" and "Get milk from store" are duplicates).
            2. Be moderately aggressive: if two tasks clearly point to the same physical action or outcome, group them.
            3. Ignore differences in capitalization or punctuation.
            4. Provide a very short, clear reason why they were grouped.
            5. Return an empty array if no clear duplicates are found.
            
            RETURN JSON: { "duplicateGroups": [{ "tasks": ["id1", "id2"], "reason": "string" }] }`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        duplicateGroups: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                                    reason: { type: SchemaType.STRING }
                                },
                                required: ["tasks", "reason"]
                            }
                        }
                    },
                    required: ["duplicateGroups"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", text);
            return res.json({ duplicateGroups: [] });
        }

        const rawGroups = data.duplicateGroups || [];
        console.log(`✅ [Duplicates] Found ${rawGroups.length} groups`);
        fs.appendFileSync('server_logs.txt', `[${new Date().toISOString()}] Duplicates found: ${rawGroups.length} groups\n`);

        res.json({ duplicateGroups: rawGroups });

    } catch (error) {
        console.error("Duplicates Error:", error);
        fs.appendFileSync('server_logs.txt', `[${new Date().toISOString()}] Duplicates Error: ${error.message}\n`);
        res.status(500).json({ error: "Failed to find duplicates" });
    }
});

// POST /api/gemini/assess-impact
app.post('/api/gemini/assess-impact', async (req, res) => {
    try {
        const { userId, newPersona } = req.body;
        // Fetch current ("old") persona from DB
        const { persona: oldPersona } = await fetchUserContext(userId);

        if (JSON.stringify(oldPersona) === JSON.stringify(newPersona)) {
            return res.json({ significant: false, reasoning: "No changes detected." });
        }

        const result = await generateAIContentWithFallback(ai, {}, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `OLD PERSONA: ${JSON.stringify(oldPersona)}
            NEW PERSONA: ${JSON.stringify(newPersona)}
            
            Compare these two profiles. 
            Did the user change anything SIGNIFICANT that would alter their Daily Priorities or Strategic Life Context?
            - Significant: Changing Job, Income, Marital Status, Core Values, Long-Term Goals.
            - Insignificant: Fixing typos, minor rewording, small style tweaks.
            
            Return JSON: { "significant": boolean, "reasoning": "short explanation" }`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        significant: { type: SchemaType.BOOLEAN },
                        reasoning: { type: SchemaType.STRING }
                    },
                    required: ["significant", "reasoning"]
                }
            }
        });

        const text = await extractGeminiText(result.response);
        res.json(JSON.parse(text));
    } catch (error) {
        console.error("Impact Assessment Error:", error);
        res.status(500).json({ error: "Failed to assess impact" });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', interactions_served: 0 });
});

const server = app.listen(port, () => {
    console.log(`🧠 Brain Server running on port ${port}`);
});

server.on('error', (err) => {
    console.error('Server failed to start:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
