/**
 * Shared catalogs for STT models, TTS voices, AI agent models, and agent colors.
 * Single source of truth — imported by SettingsContainer, AgentConfigForm, OnboardingContainer.
 */

export type STTProvider = 'openai' | 'elevenlabs';
export type TTSProvider = 'openai' | 'elevenlabs';
export type VoiceSensitivity = 'low' | 'medium' | 'high';

export interface CatalogEntry {
  id: string;
  label: string;
}

export const STT_MODELS: Record<STTProvider, CatalogEntry[]> = {
  openai: [
    { id: 'whisper-1', label: 'Whisper v1' },
    { id: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe' },
    { id: 'gpt-4o-mini-transcribe', label: 'GPT-4o Mini Transcribe' },
  ],
  elevenlabs: [
    { id: 'scribe_v1', label: 'Scribe v1 (Recommended)' },
    { id: 'scribe_v1_experimental', label: 'Scribe v1 Experimental' },
  ],
};

export const TTS_VOICES: Record<TTSProvider, CatalogEntry[]> = {
  openai: [
    { id: 'alloy', label: 'Alloy' },
    { id: 'ash', label: 'Ash' },
    { id: 'ballad', label: 'Ballad' },
    { id: 'cedar', label: 'Cedar' },
    { id: 'coral', label: 'Coral' },
    { id: 'echo', label: 'Echo' },
    { id: 'fable', label: 'Fable' },
    { id: 'marin', label: 'Marin' },
    { id: 'nova', label: 'Nova' },
    { id: 'onyx', label: 'Onyx' },
    { id: 'sage', label: 'Sage' },
    { id: 'shimmer', label: 'Shimmer' },
    { id: 'verse', label: 'Verse' },
  ],
  elevenlabs: [
    { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam (Deep, Narration)' },
    { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Confident, British)' },
    { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni (Well-rounded)' },
    { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold (Crisp, American)' },
    { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill (Trustworthy, American)' },
    { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Deep, American)' },
    { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum (Intense, Transatlantic)' },
    { id: 'IKne3meq5aSn9XLyUdCD', label: 'Charlie (Natural, Australian)' },
    { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte (Swedish, Seductive)' },
    { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Casual, American)' },
    { id: '2EiwWnXFnvU5JabPnv8n', label: 'Clyde (War veteran, American)' },
    { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Authoritative, British)' },
    { id: 'CYw3kZ02Hs0563khs1Fj', label: 'Dave (Conversational, British)' },
    { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi (Strong, Feminine)' },
    { id: 'ThT5KcBeYPX3keUQqHPh', label: 'Dorothy (Pleasant, British)' },
    { id: '29vD33N1CtxCmqQRPOHJ', label: 'Drew (Well-rounded)' },
    { id: 'LcfcDJNUP1GQjkzn1xUU', label: 'Emily (Calm, Gentle)' },
    { id: 'g5CIjZEefAph4nQFvHAz', label: 'Ethan (Narrative)' },
    { id: 'D38z5RcWu1voky8WS1ja', label: 'Fin (Sailor, Irish)' },
    { id: 'jsCqWAovK2LkecY7zXl4', label: 'Freya (Expressive, Nordic)' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Warm, British)' },
    { id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi (Childlike, Animated)' },
    { id: 'zcAOhNBS3c14rBihAFp1', label: 'Giovanni (Dramatic, Italian)' },
    { id: 'z9fAnlkpzviPz146aGWa', label: 'Glinda (Witch, Dramatic)' },
    { id: 'oWAxZDx7w5VEj9dCyTzz', label: 'Grace (Southern, Warm)' },
    { id: 'SOYHLrjzK2X1ezoPC6cr', label: 'Harry (Anxious, British)' },
    { id: 'ZQe5CZNOzWyzPSCn5a3c', label: 'James (Calm, Australian)' },
    { id: 'bVMeCyTHy58xNoL34h3p', label: 'Jeremy (Energetic, Irish)' },
    { id: 't0jbNlBVZ17f02VDIeMI', label: 'Jessie (Raspy, American)' },
    { id: 'Zlb1dXrM653N07WRdFW3', label: 'Joseph (Articulate, British)' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh (Deep, Young)' },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Articulate, American)' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Warm, British)' },
    { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Warm, Australian)' },
    { id: 'flq6f7yk4E4fJM5XTYuZ', label: 'Michael (Veteran, American)' },
    { id: 'zrHiDhphv9ZnVXBqCLjz', label: 'Mimi (Cheerful, Swedish)' },
    { id: 'piTKgcLEGmPE4e6mEKli', label: 'Nicole (Whisper, American)' },
    { id: 'ODq5zmih8GrVes37Dizd', label: 'Patrick (Shouty, American)' },
    { id: '5Q0t7uMcjvnagumLfvZi', label: 'Paul (Ground news, American)' },
    { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (Calm, American)' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam (Raspy, American)' },
    { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Soft, American)' },
    { id: 'pMsXgVXv3BLzUgSXRplE', label: 'Serena (Pleasant, American)' },
    { id: 'GBv7mTt0atIp3Br8iCZE', label: 'Thomas (Calm, American)' },
  ],
};

export const AGENT_MODELS: CatalogEntry[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { id: 'o4-mini', label: 'OpenAI o4-mini' },
  { id: 'gpt-4.1', label: 'GPT-4.1' },
];

export const AGENT_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#22c55e', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#eab308', // Yellow
  '#14b8a6', // Teal
  '#a855f7', // Violet
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#d946ef', // Fuchsia
  '#0ea5e9', // Sky
  '#f59e0b', // Amber
  '#6b7280', // Grey
  '#1e1e1e', // Black
  '#e5e5e5', // White
];

export const VOICE_PROVIDERS: Array<{ id: TTSProvider; label: string }> = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'elevenlabs', label: 'ElevenLabs' },
];
