/**
 * The Ore Support agent loop.
 *
 * Shape: build context -> call the model -> execute any read-only tools -> feed results
 * back -> repeat until the model answers or escalates -> return.
 *
 * HARD LIMITS, because an agent loop is a place money and time can leak:
 *   - MAX_TOOL_TURNS caps the cycle so a model that keeps calling tools cannot loop.
 *   - A wall-clock budget aborts the run rather than holding the customer's socket open.
 *   - If anything fails, we do NOT guess an answer. We escalate to a human. A wrong
 *     answer from a support bot is worse than a slower human one.
 *
 * The agent can return an escalation. It can never perform one — escalation is a state
 * transition owned by CommsService, and the resulting action is taken by a human admin.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ChatMessage,
  ChatTool,
  CompletionResult,
  LlmProvider,
  LlmUnavailableError,
} from './ai.provider';
import { ESCALATE_DEFINITION, ESCALATE_TOOL, SupportTool, ToolContext } from './ai.tools';
import { SUPPORT_SYSTEM_PROMPT } from './ai.prompts';

const MAX_TOOL_TURNS = 6;

/**
 * Detects a reply that promises a human handoff. Deliberately broad: a false positive
 * only means a human sees a conversation slightly earlier, whereas a false negative means
 * the customer waits forever for somebody who was never called.
 */
const PROMISES_HANDOFF = /(pass(ing|ed)?\s+(this|you|it)\s+(on\s+)?to|hand(ing)?\s+(you|this)\s+(over|off)|connect(ing)?\s+you\s+(to|with)|escalat(e|ing|ed)\s+(this|it|your)|team(mate| member)|human (agent|support)|someone (from|on) our (team|side)|colleague|speciali[sz]ed? (team|agent)|i'?ll (have|get|ask) someone)/i;
const RUN_BUDGET_MS = 45_000;

export interface AgentEscalation {
  reason: string;
  summary: string;
  team: 'finance' | 'operations' | 'general';
}

export interface AgentResult {
  /** Text to show the customer. Null when the run escalated without a reply. */
  reply: string | null;
  escalation: AgentEscalation | null;
  toolCalls: string[];
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** Why the run ended. Useful for tuning and for spotting loops. */
  outcome: 'answered' | 'escalated' | 'error_escalated';
}

export interface AgentHistoryEntry {
  role: 'user' | 'support' | 'ai';
  body: string;
}

@Injectable()
export class SupportAgentService {
  private readonly logger = new Logger(SupportAgentService.name);
  private readonly tools: SupportTool[];

  constructor(private readonly provider: LlmProvider, tools: SupportTool[]) {
    this.tools = tools;
  }

  /**
   * What the model is told it can call.
   *
   * Derived from the tools that actually exist, NOT from a static list. These two used to
   * be maintained separately — a hand-written ALL_TOOL_DEFINITIONS here and the executable
   * tools in SupportToolRegistry — and adding `search_help_center` to the registry left it
   * out of the advertised set. The result was the worst kind of failure: the model was
   * never offered the one tool that could answer the question, so it confidently escalated
   * with "policy info from help centre which is not available". A tool you can execute but
   * never advertise is a tool you do not have.
   *
   * Deriving it means the two cannot drift again, and `assertReadOnlySurface` (which runs on
   * the same list at boot) now also covers whatever the model is told about.
   */
  get toolDefinitions(): ChatTool[] {
    return [...this.tools.map((t) => t.definition), ESCALATE_DEFINITION];
  }

  get dataToolNames(): string[] {
    return this.tools.map((t) => t.definition.function.name);
  }

  async respond(
    ctx: ToolContext,
    history: AgentHistoryEntry[],
    latestUserMessage: string,
  ): Promise<AgentResult> {
    const startedAt = Date.now();
    const toolCalls: string[] = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let model = '';

    const messages: ChatMessage[] = [
      { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
      ...history.slice(-20).map((h): ChatMessage => ({
        // Prior AI and human replies both appear as assistant turns; the model does not
        // need to distinguish them, and doing so would leak internal state.
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.body,
      })),
      { role: 'user', content: latestUserMessage },
    ];

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        if (Date.now() - startedAt > RUN_BUDGET_MS) {
          this.logger.warn(`agent run exceeded ${RUN_BUDGET_MS}ms; escalating`);
          return this.escalateOnError('Agent took too long to respond.', toolCalls, model);
        }

        let result: CompletionResult;
        try {
          result = await this.provider.complete({ messages, tools: this.toolDefinitions });
        } catch (err) {
          if (err instanceof LlmUnavailableError) {
            this.logger.error(`LLM unavailable: ${err.message}`);
            return this.escalateOnError('AI provider unavailable.', toolCalls, model);
          }
          throw err;
        }

        model = result.model;
        promptTokens += result.usage.promptTokens;
        completionTokens += result.usage.completionTokens;

        const calls = result.message.tool_calls ?? [];

        // No tool calls -> the model is answering the customer.
        if (calls.length === 0) {
          const reply = (result.message.content ?? '').trim();
          if (!reply) return this.escalateOnError('Empty response.', toolCalls, model);

          // ESCALATION THEATRY GUARD.
          // The single most common production failure in AI support: the model says
          // "I'll pass this to a teammate" and then does nothing, so the customer waits
          // forever. If the reply promises a human handoff, treat it as one — the state
          // transition is what matters, not the model remembering to call the tool.
          if (PROMISES_HANDOFF.test(reply)) {
            this.logger.warn('model promised a handoff without calling escalate_to_human; escalating anyway');
            return {
              reply,
              escalation: {
                reason: 'promised_handoff',
                summary:
                  'The assistant told the customer it was passing them to a teammate but did not call the ' +
                  'escalation tool. Its reply is quoted below so the agent has full context.\n\n' +
                  reply.slice(0, 1500),
                team: 'general',
              },
              toolCalls,
              model,
              promptTokens,
              completionTokens,
              outcome: 'escalated',
            };
          }

          return {
            reply,
            escalation: null,
            toolCalls,
            model,
            promptTokens,
            completionTokens,
            outcome: 'answered',
          };
        }

        messages.push(result.message);

        for (const call of calls) {
          const name = call.function?.name ?? '';
          toolCalls.push(name);

          // Escalation is a state transition, not a lookup. Stop the loop immediately —
          // we do not want the model "confirming" its own escalation with more tools.
          if (name === ESCALATE_TOOL) {
            const args = this.parseArgs(call.function.arguments);
            return {
              reply: null,
              escalation: {
                reason: String(args.reason ?? 'unspecified').slice(0, 120),
                summary: String(args.summary ?? '').slice(0, 2000),
                team: this.normalizeTeam(args.team),
              },
              toolCalls,
              model,
              promptTokens,
              completionTokens,
              outcome: 'escalated',
            };
          }

          const payload = await this.executeReadOnly(name, this.parseArgs(call.function.arguments), ctx);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(payload),
          });
        }
      }

      this.logger.warn(`agent hit MAX_TOOL_TURNS (${MAX_TOOL_TURNS}) without answering; escalating`);
      return this.escalateOnError('Agent could not resolve after several lookups.', toolCalls, model);
    } catch (err) {
      this.logger.error(`agent run failed: ${(err as Error).message}`);
      return this.escalateOnError('Internal error.', toolCalls, model);
    }
  }

  /**
   * Execute a tool. Anything not in the read-only registry is refused outright — the
   * model cannot invent a capability by naming one.
   */
  private async executeReadOnly(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<unknown> {
    const tool = this.tools.find((t) => t.definition.function.name === name);
    if (!tool) {
      return { error: `Unknown tool "${name}". Only read-only lookups are available.` };
    }
    try {
      return await tool.execute(args, ctx);
    } catch (err) {
      this.logger.warn(`tool ${name} failed: ${(err as Error).message}`);
      // Report the failure to the model rather than crashing the run.
      return { error: 'Lookup failed. If you cannot answer without it, escalate to a human.' };
    }
  }

  private parseArgs(raw: string | undefined): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private normalizeTeam(raw: unknown): 'finance' | 'operations' | 'general' {
    const v = String(raw ?? '').toLowerCase();
    if (v === 'finance') return 'finance';
    if (v === 'operations') return 'operations';
    return 'general';
  }

  /**
   * Fail safe, always. Any error path escalates to a human instead of inventing an answer,
   * and says so plainly to the customer rather than pretending to be fine.
   */
  private escalateOnError(reason: string, toolCalls: string[], model: string): AgentResult {
    return {
      reply: null,
      escalation: {
        reason: 'agent_error',
        summary: `The assistant could not complete this request (${reason}). A human agent should pick it up.`,
        team: 'general',
      },
      toolCalls,
      model,
      promptTokens: 0,
      completionTokens: 0,
      outcome: 'error_escalated',
    };
  }
}
