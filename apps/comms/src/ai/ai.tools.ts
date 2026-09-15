/**
 * The support AI's entire capability surface — and it is READ-ONLY.
 *
 * THE RULE: the AI may read, explain, and escalate. It may never write. Not the ledger,
 * not orders, not refunds, not wallets, not tickets, not notifications. Every action a
 * customer asks for becomes an escalation to the human admin who owns that decision.
 *
 * This is enforced structurally, not by asking the model nicely:
 *   1. Every tool must declare `readonly: true` — the type requires it.
 *   2. `assertReadOnlySurface()` runs at module load and throws if any tool is not
 *      read-only, so a future careless addition fails the build/startup, not production.
 *   3. Tool executors receive a `ToolContext` that carries NO repository and NO write
 *      client. There is nothing here capable of mutating state.
 *   4. Every tool is scoped to the authenticated user. The AI cannot look up another
 *      customer's order by guessing an id — executors verify ownership themselves.
 *
 * If someone needs the AI to *do* something, the answer is: add an escalation reason,
 * not a write tool.
 */

import { ChatTool } from './ai.provider';

export const ESCALATE_TOOL = 'escalate_to_human';

/** Read-only data tools the model may call. Descriptions are written for the model. */
export interface SupportTool {
  readonly definition: ChatTool;
  readonly readonly: true;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<unknown>;
}

/**
 * Everything a tool is allowed to reach. Deliberately contains no repository, no bus
 * and no write client. Adding a write capability here would defeat the whole design.
 */
export interface ToolContext {
  readonly userId: string;
  readonly role: string;
  readonly threadId: string;
  /** Populated by SupportToolService with read-only lookups. */
  readonly lookups: SupportLookups;
}

export interface SupportLookups {
  ordersForUser(userId: string): Promise<unknown[]>;
  orderForUser(userId: string, orderId: string): Promise<unknown | null>;
  orderTimeline(orderId: string): Promise<unknown>;
  riderLocation(orderId: string): Promise<unknown | null>;
  walletForUser(userId: string): Promise<unknown | null>;
  paymentForOrder(orderId: string): Promise<unknown | null>;
  vendorStatus(vendorId: string): Promise<unknown | null>;
}

const str = (description: string) => ({ type: 'string', description });

/**
 * `escalate_to_human` is not a data tool — it is the AI admitting it needs a human.
 * The agent loop treats a call to this as a state transition, never as a lookup.
 */
export const ESCALATE_DEFINITION: ChatTool = {
  type: 'function',
  function: {
    name: ESCALATE_TOOL,
    description:
      'Escalate this conversation to a human support agent. REQUIRED whenever the customer needs an ACTION ' +
      '(refund, cancellation, credit, complaint, account change) or sends an attachment, and whenever you are ' +
      'not confident. Always look up the relevant real data FIRST so the summary contains facts. ' +
      'You cannot perform actions yourself — never promise one.',
    parameters: {
      type: 'object',
      properties: {
        reason: str('Short machine-readable reason, e.g. refund_request, complaint, attachment, low_confidence'),
        summary: str(
          'Handoff note for the human agent: what the customer wants, the real order/payment state you looked ' +
            + 'up, and what has already been tried. Be specific — the agent should not have to re-ask.',
        ),
        team: {
          type: 'string',
          description: 'Which team should own this',
          enum: ['finance', 'operations', 'general'],
        },
      },
      required: ['reason', 'summary'],
    },
  },
};

/**
 * NOTE: there used to be a `DATA_TOOL_DEFINITIONS` / `ALL_TOOL_DEFINITIONS` list here, and
 * the agent advertised THAT to the model while SupportToolRegistry held the tools it could
 * actually execute. The two drifted: `search_help_center` was added to the registry and not
 * here, so the model was never offered it and escalated policy questions claiming the help
 * centre "is not available".
 *
 * The advertised list is now derived from the executable tools in SupportAgentService, so
 * there is exactly one place a tool is defined. Do not reintroduce a static copy.
 */

/** Hard startup check: the surface must be read-only or the service refuses to boot. */
export function assertReadOnlySurface(tools: SupportTool[]): void {
  for (const tool of tools) {
    if (tool.readonly !== true) {
      throw new Error(
        `Support tool "${tool.definition.function.name}" is not marked readonly. ` +
          'The support AI is strictly read-only by design — remove the tool or make it read-only. ' +
          'Actions must be handled by escalating to a human admin.',
      );
    }
    if (tool.definition.function.name === ESCALATE_TOOL) {
      throw new Error('escalate_to_human is handled by the agent loop and must not be registered as a data tool');
    }
  }
}
