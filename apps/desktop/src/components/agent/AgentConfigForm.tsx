import React, { useState, useEffect } from 'react';

interface SecretBinding {
  secretId: string;
  envVarName: string;
}

interface SecretInfo {
  id: string;
  name: string;
  type: string;
}

import {
  type TTSProvider,
  TTS_VOICES,
  AGENT_COLORS,
} from '@/constants/provider-catalog';
import type { RuntimeMetadataInfo } from '@/hooks/useRuntimeMetadata';

export interface AgentFormValues {
  id?: string;
  name: string;
  runtime: string;
  model?: string;
  systemPrompt?: string;
  color: string;
  avatarUrl?: string;
  voice: { ttsVoiceId: string };
  cwd?: string;
  autoStart?: boolean;
  allowFullAccess?: boolean;
  allowInterrupts?: boolean;
  allowComputerUse?: boolean;
  secretBindings?: SecretBinding[];
}

interface AgentConfigFormProps {
  onSubmit: (profile: Record<string, unknown>) => void;
  onCancel: () => void;
  initialValues?: AgentFormValues;
  runtimes?: RuntimeMetadataInfo[];
}

export const AgentConfigForm: React.FC<AgentConfigFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  runtimes: runtimesProp,
}) => {
  const availableRuntimes = runtimesProp ?? [
    { id: 'claude-code', displayName: 'Claude Code', models: [] },
  ];
  const isEditing = !!initialValues?.id;

  const [name, setName] = useState(initialValues?.name ?? '');
  const [runtime, setRuntime] = useState(initialValues?.runtime ?? 'claude-code');
  const [model, setModel] = useState(initialValues?.model ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initialValues?.systemPrompt ?? '');
  const [color, setColor] = useState(initialValues?.color ?? AGENT_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState(initialValues?.avatarUrl ?? '');
  const [ttsVoiceId, setTtsVoiceId] = useState(initialValues?.voice?.ttsVoiceId ?? '');
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('openai');
  const [cwd, setCwd] = useState(initialValues?.cwd ?? '');
  const [autoStart, setAutoStart] = useState(initialValues?.autoStart ?? false);
  const [allowFullAccess, setAllowFullAccess] = useState(initialValues?.allowFullAccess ?? false);
  const [allowInterrupts, setAllowInterrupts] = useState(initialValues?.allowInterrupts ?? false);
  const [allowComputerUse, setAllowComputerUse] = useState(initialValues?.allowComputerUse ?? false);
  const [secretBindings, setSecretBindings] = useState<SecretBinding[]>(initialValues?.secretBindings ?? []);
  const [availableSecrets, setAvailableSecrets] = useState<SecretInfo[]>([]);
  const [testingVoice, setTestingVoice] = useState(false);

  // Load available secrets from vault
  useEffect(() => {
    window.jam.secrets.list().then(setAvailableSecrets);
  }, []);

  // Load TTS provider from global config and ensure voice is compatible
  useEffect(() => {
    window.jam.config.get().then((c) => {
      const provider = (c.ttsProvider as TTSProvider) || 'openai';
      setTtsProvider(provider);

      const providerVoices = TTS_VOICES[provider] || [];
      const storedVoice = initialValues?.voice?.ttsVoiceId;
      const isCompatible = storedVoice && providerVoices.some((v) => v.id === storedVoice);

      if (isCompatible) {
        setTtsVoiceId(storedVoice);
      } else {
        // Stored voice is missing or incompatible with current provider — use default
        const defaultVoice = (c.ttsVoice as string) || providerVoices[0]?.id || '';
        setTtsVoiceId(defaultVoice);
      }
    });
  }, [initialValues?.voice?.ttsVoiceId]);

  const voices = TTS_VOICES[ttsProvider] || [];
  const currentRuntime = availableRuntimes.find((r) => r.id === runtime);
  const models = currentRuntime?.models ?? [];

  // Group models by their group label
  const modelGroups = models.reduce<Record<string, typeof models>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const voiceId = ttsVoiceId || voices[0]?.id || 'alloy';
    // Filter out incomplete bindings
    const validBindings = secretBindings.filter(
      (b) => b.secretId && b.envVarName.trim(),
    );

    onSubmit({
      ...(isEditing ? { id: initialValues!.id } : {}),
      name,
      runtime,
      model: model || undefined,
      systemPrompt: systemPrompt || undefined,
      color,
      avatarUrl: avatarUrl || undefined,
      voice: { ttsVoiceId: voiceId },
      cwd: cwd || undefined,
      autoStart,
      allowFullAccess,
      allowInterrupts,
      allowComputerUse,
      secretBindings: validBindings.length > 0 ? validBindings : undefined,
    });
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    try {
      const voiceId = ttsVoiceId || voices[0]?.id || 'alloy';
      const result = await window.jam.voice.testVoice(voiceId);
      if (result.success && result.audioData) {
        const audio = new Audio(result.audioData);
        audio.play();
      }
    } catch { /* ignore */ }
    finally { setTestingVoice(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">
        {isEditing ? `Configure ${initialValues!.name}` : 'New Agent'}
      </h3>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Mike"
          required
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Runtime</label>
        <select
          value={runtime}
          onChange={(e) => {
            setRuntime(e.target.value);
            setModel('');
          }}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
        >
          {availableRuntimes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">Default</option>
          {Object.entries(modelGroups).map(([group, groupModels]) => (
            <optgroup key={group} label={group}>
              {groupModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Persona / System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="e.g., You are wise and always reflect before your final reply..."
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          Working Directory
        </label>
        <input
          type="text"
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          placeholder={name ? `~/.jam/agents/` + name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() : '~/.jam/agents/agent-name'}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-zinc-600 mt-1">
          Defaults to ~/.jam/agents/agent-name if left empty. Created automatically.
        </p>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Voice</label>
        <div className="flex gap-2">
          <select
            value={ttsVoiceId}
            onChange={(e) => setTtsVoiceId(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={testingVoice}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded-lg text-sm text-zinc-300 disabled:opacity-50 transition-colors"
            title="Preview voice"
          >
            {testingVoice ? '...' : '\u25B6'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Color</label>
        <div className="flex flex-wrap gap-2">
          {AGENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Avatar Image</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="URL or upload a file"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={async () => {
              const result = await window.jam.agents.uploadAvatar();
              if (result.success && result.avatarUrl) {
                setAvatarUrl(result.avatarUrl);
              }
            }}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded-lg text-xs text-zinc-300 transition-colors whitespace-nowrap"
          >
            Upload
          </button>
          {avatarUrl && (
            <img
              src={avatarUrl.startsWith('/') ? `jam-local://${avatarUrl}` : avatarUrl}
              alt="Preview"
              className="w-8 h-8 rounded-full object-cover border border-zinc-600 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">
          Optional. Paste a URL or upload a file. Shows a colored initial if left empty.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoStart"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
          />
          <label htmlFor="autoStart" className="text-xs text-zinc-400">
            Auto-start on app launch
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowFullAccess"
            checked={allowFullAccess}
            onChange={(e) => setAllowFullAccess(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
          />
          <label htmlFor="allowFullAccess" className="text-xs text-zinc-400">
            Full access <span className="text-zinc-600">(web search, file ops, no confirmation prompts)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowInterrupts"
            checked={allowInterrupts}
            onChange={(e) => setAllowInterrupts(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-zinc-900"
          />
          <label htmlFor="allowInterrupts" className="text-xs text-zinc-400">
            Allow interrupts <span className="text-zinc-600">(new commands abort the current task)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowComputerUse"
            checked={allowComputerUse}
            onChange={(e) => setAllowComputerUse(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-900"
          />
          <label htmlFor="allowComputerUse" className="text-xs text-zinc-400">
            Computer Use <span className="text-zinc-600">(virtual desktop — screenshot, click, type, browser)</span>
          </label>
        </div>
      </div>

      {/* Secret Bindings */}
      {availableSecrets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-zinc-400">Secret Bindings</label>
            <button
              type="button"
              onClick={() =>
                setSecretBindings([...secretBindings, { secretId: '', envVarName: '' }])
              }
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + Add
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mb-2">
            Inject secrets as environment variables. The agent can use them without seeing the actual values.
          </p>
          <div className="space-y-2">
            {secretBindings.map((binding, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={binding.secretId}
                  onChange={(e) => {
                    const updated = [...secretBindings];
                    updated[idx] = { ...updated[idx], secretId: e.target.value };
                    // Auto-fill env var name from secret name
                    if (e.target.value && !updated[idx].envVarName) {
                      const secret = availableSecrets.find((s) => s.id === e.target.value);
                      if (secret) {
                        updated[idx].envVarName = secret.name
                          .toUpperCase()
                          .replace(/[^A-Z0-9]+/g, '_');
                      }
                    }
                    setSecretBindings(updated);
                  }}
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select secret...</option>
                  {availableSecrets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={binding.envVarName}
                  onChange={(e) => {
                    const updated = [...secretBindings];
                    updated[idx] = { ...updated[idx], envVarName: e.target.value };
                    setSecretBindings(updated);
                  }}
                  placeholder="ENV_VAR_NAME"
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setSecretBindings(secretBindings.filter((_, i) => i !== idx))}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isEditing ? 'Save Changes' : 'Create Agent'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
