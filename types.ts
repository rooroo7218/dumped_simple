
export interface OnboardingData {
  name: string;
  roles: string[];
  lifeAreas: string[];
  goals: string[];          // up to 3
  brainDump: string;
  hoursPerDay: string;      // e.g. "2–4 hours"
  dependents: string[];
  avoidances: string;
  workStyle: string;        // peak energy time
  successVision: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  lastLogin: number;
}

export interface TaskStep {
  id: string;
  text: string;
  durationMinutes: number;
  completed: boolean;
}

export interface ActionItem {
  text: string;
  urgency: number; // 1-10
  effort: 'low' | 'medium' | 'high';
  id: string;
  completed: boolean;
  completedAt?: number; // Timestamp (ms) when task was marked done
  category: string; // Dynamic life bucket
  estimatedMinutes?: number;
  steps?: TaskStep[];
  scheduledTime?: number; // Start timestamp
  durationMinutes?: number; // Estimated length
  rationale?: string; // AI logic for the priority/urgency
  x?: number; // Canvas coordinate %
  y?: number; // Canvas coordinate %
  // Intelligent Prioritization Metadata
  alignmentScore?: number; // 0-100 (returned by Gemini reprioritization)
  impactArea?: string;      // Which goal/value this serves
  contextTags?: string[];   // Contexts: "At Computer", "Low Energy", "Errands", etc.
  completeBy?: number;
  dependencies?: string[];  // IDs of tasks this depends on
  deadline?: number;        // Timestamp
  lastReviewed?: number;    // Timestamp
  description?: string;     // User-provided detailed notes
  categoryOrder?: number;   // Manual order within its specific category
  globalOrder?: number;     // Manual order across all tasks (for Priorities view)
  trend?: 'up' | 'down' | 'same';
  trendDelta?: number;
  isNew?: boolean;
  batchId?: string; // ID for grouping related tasks
  memoryId?: string; // Reference to parent memory
  starred?: boolean;    // Task is starred as important
  viewCount?: number;   // How many times the task has been opened/viewed
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime'; // Best time slot for this task
  parked?: boolean;     // Task is in the "Maybe Later" parking lot
  categoryConfidence?: number; // 0-100: AI confidence in category assignment
}

export interface MemoryItem {
  id: string;
  timestamp: number;
  content: string;
  source: 'text' | 'voice' | 'file';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  processed: boolean;
  category: string;
  actions?: ActionItem[];
  lifeContextInsight?: string;
  mood?: string;
  energyLevel?: number; // 1-10 daily capacity
}

export interface DiaryEntry {
  id: string;
  timestamp: number;
  content: string;
  mood?: string; // e.g., "reflective", "frustrated", "hopeful"
  transmutationCount: number; // How many times this entry led to tasks
}

export interface WorldBoss {
  id: string;
  name: string;
  category: string;
  maxHp: number;
  currentHp: number;
  description: string;
  isDead: boolean;
  imageUrl?: string;
}

export interface UserPersona {
  writingStyle: string;
  thoughtProcess: string;
  values: string[]; // High-level strings
  coreValues?: { value: string; importance: number; description: string }[]; // Structured values
  speakingNuances: string;
  age?: number;
  jobTitle?: string;
  incomeLevel?: string;
  maritalStatus?: string;
  lifestyle?: string;
  longTermGoals?: { goal: string; timeframe: '1-year' | '3-year' | '5-year'; category: string; priority?: number }[];
  productivityPatterns?: { peakEnergyTime: string; focusType: string };
  currentConstraints?: string[];
  lastPrioritized?: number; // Timestamp of last global re-rank
  lastUpdated?: number; // Timestamp of last edit (for sync resolution)
  customCategories?: string[];
  brutalistBackground?: string;
  successVision?: string;
  profileInsights?: { question: string; answer: string; answeredAt: number }[];
  behavioralPatterns?: {
    categoryStats: Record<string, { total: number; completed: number; lastUpdated: number }>;
    avoidedCategories: string[];
  };
  moodTrends?: {
    dominantMoods: string[];
    moodHistory: { mood: string; timestamp: number }[];
    energySignal: 'low' | 'medium' | 'high' | null;
  };
  aiObservations?: {
    insights: { text: string; generatedAt: number; source: 'dump' | 'journal' | 'task' }[];
    identityNotes: string;
    goalDriftNote: string;
    lastUpdatedAt: number;
    dumpsAtLastUpdate: number;
    journalsAtLastUpdate: number;
  };
}

export interface AppState {
  memories: MemoryItem[];
  persona: UserPersona;
  user?: UserProfile;
}

export interface DuplicateGroup {
  id: string; // Internal group ID
  tasks: ActionItem[]; // The tasks that are semantically identical
  reason: string; // AI explanation of why they are duplicates
}

export type StickerRarity = 'common' | 'rare' | 'legendary' | 'holographic';

export interface Sticker {
  id: string;
  name: string;
  emoji: string;
  description: string;
  imageUrl?: string;
  style?: 'stamp' | 'jelly' | 'classic';
}

export interface UserSticker {
  id: string;
  stickerId: string;
  rarity: StickerRarity;
  earnedAt: number;
  taskId?: string; // Which task earned this sticker
  taskText?: string; // Cache the task text at the time of completion
  x?: number; // Canvas coordinate %
  y?: number; // Canvas coordinate %
  rotation?: number; // Random tilt for organic feel
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface LifeSynthesis {
  themes: string[];
  frictionPoints: string[];
  currentTrajectory: string;
  synthesis: string;
  strategicReasoning: string;
  nextSteps: string[];
}

export interface ExternalEvent {
  id: string;
  summary: string;
  start: number;
  end: number;
}

export interface RippleEffect { id: string; x: number; y: number; }

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: { stickerId: string; count: number }[];
  resultStickerId: string;
  resultRarity: StickerRarity;
}

export interface Item {
  id: string;
  userId: string;
  label: string;
  mentionCount: number;
  lastMentionedAt: number;
  firstMentionedAt: number;
  isFlagged: boolean;
  flagOrder?: number;
  isCompleted: boolean;
  completedAt?: number;
  fadedAt?: number;
  createdAt: number;
  style?: { color: string; texture: string };
  excerpts?: DumpItem[]; // Loaded on expansion
}

export interface DumpItem {
  id: string;
  dumpId: string;
  itemId: string;
  rawExcerpt: string;
  createdAt: number;
}