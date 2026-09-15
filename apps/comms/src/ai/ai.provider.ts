/**
 * Provider-agnostic LLM access for Ore Support.
 *
 * WHY THIS FILE EXISTS
 * We run on Groq today and move to OpenAI later. Both expose the OpenAI-compatible
 * Chat Completions API, so the only things that differ are the base URL, the key and
 * the model name — all config. Nothing in the agent, the tools or the guardrails
 * should ever mention a vendor.
 *
 * WHY CHAT COMPLETIONS AND NOT THE RESPONSES API
 * Groq's Responses API is beta and does not support `store` or `previous_response_id`,
 * so server-side conversation state is unavailable there. We already persist threads
 * and messages in the comms service, so we send full history each turn — which is
 * exactly what Groq requires, and what OpenAI also accepts. Building on the mature,
 * fully-supported Chat Completions surface keeps the migration to a config change.
 *
 * READ-ONLY NOTE: this layer only produces text and tool calls. It has no access to any
 * repository and cannot write anything. See ai.tools.ts for the enforced read-only surface.
 */

export interface ChatToolParameter {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ChatToolParameter;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface CompletionResult {
  message: ChatMessage;
  finishReason: string | null;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools?: ChatTool[];
  /** Cap the loop so a tool cycle can never run away or run up a bill. */
  maxTokens?: number;
  temperature?: number;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

export interface LlmConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  fallbackModel: string | null;
  timeoutMs: number;
}

const DEFAULT_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openai: 'https://api.openai.com/v1',
};

/** Read config from env. Base URL, key and model are never hardcoded in behaviour. */
export function loadLlmConfig(env: Record<string, string | undefined> = process.env): LlmConfig {
  const provider = (env.AI_PROVIDER ?? 'groq').trim().toLowerCase();
  const apiKey = env.AI_API_KEY ?? env.GROQ_API_KEY ?? env.OPENAI_API_KEY ?? '';
  const fallback = env.AI_BASE_URL?.trim();
  return {
    provider,
    baseUrl: (fallback || DEFAULT_BASE_URLS[provider] || DEFAULT_BASE_URLS.groq).replace(/\/$/, ''),
    apiKey,
    model: env.AI_MODEL?.trim() || 'openai/gpt-oss-120b',
    fallbackModel: env.AI_MODEL_FALLBACK?.trim() || null,
    timeoutMs: Number(env.AI_TIMEOUT_MS ?? 30_000),
  };
}

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

/**
 * One implementation for every OpenAI-compatible vendor. Switching Groq -> OpenAI is
 * `AI_PROVIDER=openai`, `AI_API_KEY=sk-...`, `AI_MODEL=gpt-4o` and nothing else.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly config: LlmConfig) {
    this.name = config.provider;
  }

  get enabled(): boolean {
    return this.config.apiKey.length > 0;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.enabled) {
      throw new LlmUnavailableError('AI_API_KEY is not configured; support AI is disabled');
    }
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3,
    };
    if (req.tools?.length) {
      body.tools = req.tools;
      // 'auto' — the model decides. Never 'required': that would force a tool call on
      // every turn and break plain conversational replies.
      body.tool_choice = 'auto';
    }
    if (req.maxTokens) body.max_tokens = req.maxTokens;

    const res = await this.postWithTimeout(body);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new LlmUnavailableError(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    const json = (await res.json()) as Record<string, any>;
    const choice = json.choices?.[0];
    const message = choice?.message;
    if (!message) {
      throw new LlmUnavailableError(`LLM returned no message: ${JSON.stringify(json).slice(0, 300)}`);
    }
    return {
      message: {
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : null,
        ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
      },
      finishReason: choice.finish_reason ?? null,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
      model: json.model ?? this.config.model,
    };
  }

  private async postWithTimeout(body: Record<string, unknown>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const reason = (err as Error)?.name === 'AbortError' ? `timed out after ${this.config.timeoutMs}ms` : (err as Error)?.message;
      throw new LlmUnavailableError(`LLM request failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
