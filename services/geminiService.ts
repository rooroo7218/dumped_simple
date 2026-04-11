import { MemoryItem, UserPersona, ActionItem, TaskStep, DuplicateGroup, DiaryEntry } from "../types";
import { supabase } from './supabaseClient';
import { databaseService } from './databaseService';

const API_BASE_URL = '/api/gemini';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function postToApi(endpoint: string, body: any, retries = 3, delay = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ [API] ${endpoint} failed with status ${response.status}:`, errorData);

      if (response.status === 429) {
        throw new Error("Quota exceeded. Please wait a moment and try again.");
      }

      // If it's a 5xx error, we might want to retry
      if (response.status >= 500 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return postToApi(endpoint, body, retries - 1, delay * 2);
      }

      throw new Error(errorData.message || errorData.error || `Server Error (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if it's a network error (like "Failed to fetch")
    const isNetworkError = error.name === 'TypeError' && error.message === 'Failed to fetch';
    const isTimeout = error.name === 'AbortError';

    if ((isNetworkError || isTimeout) && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return postToApi(endpoint, body, retries - 1, delay * 2);
    }

    if (isTimeout) {
      console.error(`⏱️ [API] ${endpoint} timed out after 60s`);
      throw new Error("Request timed out. The AI is processing a lot of data, please ensure the backend is running and try again.");
    }

    if (isNetworkError) {
      console.error(`❌ [API] ${endpoint} network error:`, error.message);
      throw new Error("Unable to connect. Please check your internet connection and try again.");
    }

    console.error(`❌ [API] ${endpoint} failed:`, error.message);
    throw error;
  }
}

// Helper to get User ID (Supports Tester Mode)
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;

  // Fallback for Tester Mode
  const localUser = localStorage.getItem('dumped_user');
  if (localUser) {
    try {
      const parsed = JSON.parse(localUser);
      if (parsed.id) return parsed.id;
    } catch (e) {
      console.warn("Failed to parse local user", e);
    }
  }

  throw new Error("User not authenticated");
}

export async function processBrainDump(
  input: string,
  history: MemoryItem[],
  persona: UserPersona,
  imageAttachment?: { data: string, mimeType: string }
) {
  try {
    const userId = await getCurrentUserId();

    // Server now fetches history/persona based on userId
    return await postToApi('brain-dump', { userId, input, imageAttachment });
  } catch (error: any) {
    console.error("❌ Brain Dump Processing Error:", error);
    const isQuota = error.message?.includes('429') || error.message?.toLowerCase().includes('quota');
    return {
      actions: [],
      summary: isQuota
        ? "Gemini API Limit Reached (Free Tier). Please wait about 60 seconds and try again."
        : `Connection Error: ${error.message || "Unable to reach brain server"}. Please ensure the backend is running.`,
      category: "Error",
      tags: [],
      priority: "low"
    };
  }
}

export async function synthesizeLifeContext(history: MemoryItem[], persona: UserPersona) {
  try {
    const userId = await getCurrentUserId();
    return await postToApi('synthesize', { userId });
  } catch (error) {
    return {
      themes: [],
      frictionPoints: [],
      currentTrajectory: "",
      synthesis: "Unable to synthesize context at this time.",
      strategicReasoning: ""
    };
  }
}

export async function recommendWeeklyPriorities(tasks: ActionItem[], synthesis: any) {
  try {
    const userId = await getCurrentUserId();
    return await postToApi('recommend', { userId, synthesis });
  } catch (error) {
    return { recommendations: [] };
  }
}

export async function generateStepBreakdown(task: ActionItem, persona: UserPersona): Promise<TaskStep[]> {
  try {
    const userId = await getCurrentUserId();
    const data = await postToApi('breakdown', { userId, task });
    return data.steps || [];
  } catch (error) {
    return [];
  }
}

export async function getCoachResponse(
  messages: { role: 'user' | 'model', text: string }[],
  tasks: ActionItem[],
  persona: UserPersona
) {
  try {
    const userId = await getCurrentUserId();
    return await postToApi('coach', { userId, messages });
  } catch (error) {
    return { advice: "I'm having trouble connecting to my strategic center right now." };
  }
}

export async function assessPersonaImpact(oldPersona: UserPersona, newPersona: UserPersona): Promise<{ significant: boolean; reasoning: string }> {
  try {
    const userId = await getCurrentUserId();
    return await postToApi('assess-impact', { userId, newPersona });
  } catch (error) {
    return { significant: false, reasoning: "Error connecting to server." };
  }
}

export async function reprioritizeTasks(
  allTasks: ActionItem[],
  persona: UserPersona,
  recentContext: MemoryItem[],
  diaryEntries: DiaryEntry[] = [],
  allTasksIncludingCompleted?: ActionItem[]
): Promise<{ updatedTasks: ActionItem[], strategySummary: string }> {
  try {
    const userId = await getCurrentUserId();

    const sanitizedPersona = databaseService.sanitizePersona(persona);
    // BATCHING STRATEGY: Split into chunks of 20 for speed and stability
    const CHUNK_SIZE = 20;
    const taskChunks = [];
    for (let i = 0; i < allTasks.length; i += CHUNK_SIZE) {
      taskChunks.push(allTasks.slice(i, i + CHUNK_SIZE));
    }

    const results = [];
    for (let i = 0; i < taskChunks.length; i++) {
      const chunk = taskChunks[i];
      const result = await postToApi('reprioritize', {
        userId,
        persona: sanitizedPersona,
        tasks: chunk,
        diaryEntries,
        allTasksForStats: allTasksIncludingCompleted ?? allTasks,
        clientHour: new Date().getHours(),
      });
      results.push(result);
    }

    let allUpdatedTasks: any[] = [];
    let combinedSummary = "";

    results.forEach((data) => {
      const batchUpdates = data.updatedTasks || [];
      allUpdatedTasks = [...allUpdatedTasks, ...batchUpdates];
      if (data.strategySummary && !combinedSummary.includes(data.strategySummary)) {
        combinedSummary += (combinedSummary ? " | " : "") + data.strategySummary;
      }
    });

    const updates = allUpdatedTasks;
    const strategySummary = combinedSummary || "[Fallback] Tasks re-prioritized against your strategic goals.";

    const updatedTasks = allTasks.map(task => {
      const update = updates.find((u: any) => u.id === task.id);
      if (!update) return task;
      return {
        ...task,
        urgency: Number(update.urgency) || task.urgency,
        alignmentScore: update.alignmentScore !== undefined ? Number(update.alignmentScore) : task.alignmentScore,
        impactArea: update.impactArea ?? task.impactArea,
        rationale: update.rationale ?? task.rationale,
        effort: update.effort ?? task.effort,
        estimatedMinutes: update.estimatedMinutes ?? task.estimatedMinutes,
        contextTags: update.contextTags ?? task.contextTags ?? [],
        lastReviewed: Date.now(),
      };
    });

    return { updatedTasks, strategySummary };
  } catch (error: any) {
    console.error("Reprioritization failed", error);
    const errorMessage = error.message || "Unknown Error";
    return {
      updatedTasks: allTasks,
      strategySummary: `Failed to sync with strategic center. Error: ${errorMessage}`
    };
  }
}

export async function findDuplicateTasks(allTasks: ActionItem[]): Promise<DuplicateGroup[]> {
  try {
    const userId = await getCurrentUserId();
    const data = await postToApi('duplicates', { userId, tasks: allTasks });
    const rawGroups = data.duplicateGroups || [];

    // Hydrate local objects
    return rawGroups.map((g: any, i: number) => ({
      id: `dup-${i}`,
      reason: g.reason,
      tasks: g.tasks.map((id: string) => allTasks.find(t => t.id === id)).filter(Boolean) as ActionItem[]
    })).filter((g: any) => g.tasks.length > 1);
  } catch (error) {
    return [];
  }
}


export async function getMorningGreeting(persona: UserPersona): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    const data = await postToApi('greeting', { userId, persona, clientHour: new Date().getHours() }, 1, 1000);
    return data.greeting ?? null;
  } catch {
    return null;
  }
}

export async function updateUserProfile(payload: {
  triggerSource: 'dump' | 'journal' | 'task';
  recentDumpContent?: string;
  recentDiaryEntries: { content: string; mood: string; timestamp: number }[];
  categoryStats: Record<string, { total: number; completed: number }>;
  currentObservations: { identityNotes: string; goalDriftNote: string; insights: { text: string; generatedAt: number }[] };
  persona: { longTermGoals: UserPersona['longTermGoals']; jobTitle?: string; values: string[] };
}): Promise<{ newInsight: string; identityNotes: string; goalDriftNote: string } | null> {
  try {
    const userId = await getCurrentUserId();
    const data = await postToApi('update-profile', { userId, ...payload }, 1, 1000);
    if (!data?.newInsight) return null;
    return { newInsight: data.newInsight, identityNotes: data.identityNotes, goalDriftNote: data.goalDriftNote };
  } catch {
    return null;
  }
}
