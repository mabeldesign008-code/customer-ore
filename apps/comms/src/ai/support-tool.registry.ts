/**
 * Builds the read-only tool registry and wires the agent.
 *
 * This is the only place a SupportTool is constructed. Every tool here delegates to
 * SupportToolService, which is GET-only, so the registry cannot contain a write path.
 * `assertReadOnlySurface` runs on construction: if anyone adds a non-read-only tool the
 * service fails at boot rather than in production.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupportAgentService } from './ai.agent';
import { OpenAiCompatibleProvider, loadLlmConfig } from './ai.provider';
import { SupportTool, ToolContext, assertReadOnlySurface } from './ai.tools';
import { SupportToolService } from './support-tools.service';
import { ContentService } from '../content.service';

@Injectable()
export class SupportToolRegistry implements OnModuleInit {
  private readonly tools: SupportTool[];
  readonly agent: SupportAgentService;
  /** Read-only data access, exposed so the orchestrator can build a ToolContext. */
  readonly lookups: SupportToolService;
  readonly providerName: string;
  readonly model: string;
  readonly enabled: boolean;

  constructor(lookups: SupportToolService, private readonly content: ContentService) {
    this.lookups = lookups;
    const config = loadLlmConfig();
    const provider = new OpenAiCompatibleProvider(config);
    this.providerName = provider.name;
    this.model = config.model;
    this.enabled = provider.enabled;

    const arg = (v: unknown, key: string): string => {
      const raw = (v as Record<string, unknown>)?.[key];
      return typeof raw === 'string' ? raw : '';
    };

    this.tools = [
      {
        definition: {
          type: 'function',
          function: {
            name: 'list_my_orders',
            description: "List the customer's own recent orders.",
            parameters: { type: 'object', properties: {}, required: [] },
          },
        },
        readonly: true,
        execute: (_a, ctx: ToolContext) => this.lookups.ordersForUser(ctx.userId),
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'get_order',
            description: "Look up one of the customer's own orders by reference or id.",
            parameters: {
              type: 'object',
              properties: { orderRef: { type: 'string', description: 'Order reference or id' } },
              required: ['orderRef'],
            },
          },
        },
        readonly: true,
        execute: (a, ctx: ToolContext) => this.lookups.orderForUser(ctx.userId, arg(a, 'orderRef')),
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'get_order_timeline',
            description: "Status history of one of the customer's own orders.",
            parameters: {
              type: 'object',
              properties: { orderRef: { type: 'string', description: 'Order reference or id' } },
              required: ['orderRef'],
            },
          },
        },
        readonly: true,
        execute: async (a, ctx: ToolContext) => {
          const order = await this.lookups.orderForUser(ctx.userId, arg(a, 'orderRef'));
          // Ownership is checked before the timeline is fetched.
          return order ? this.lookups.orderTimeline(String(order.id)) : null;
        },
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'get_rider_location',
            description: "Current rider position and ETA for one of the customer's own orders.",
            parameters: {
              type: 'object',
              properties: { orderRef: { type: 'string', description: 'Order reference or id' } },
              required: ['orderRef'],
            },
          },
        },
        readonly: true,
        execute: async (a, ctx: ToolContext) => {
          const order = await this.lookups.orderForUser(ctx.userId, arg(a, 'orderRef'));
          return order ? this.lookups.riderLocation(String(order.id)) : null;
        },
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'get_payment',
            description: "Payment state for one of the customer's own orders. Read-only.",
            parameters: {
              type: 'object',
              properties: { orderRef: { type: 'string', description: 'Order reference or id' } },
              required: ['orderRef'],
            },
          },
        },
        readonly: true,
        execute: async (a, ctx: ToolContext) => {
          const order = await this.lookups.orderForUser(ctx.userId, arg(a, 'orderRef'));
          return order ? this.lookups.paymentForOrder(String(order.id)) : null;
        },
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'get_wallet_balance',
            description: "The customer's own wallet balance. Read-only.",
            parameters: { type: 'object', properties: {}, required: [] },
          },
        },
        readonly: true,
        execute: (_a, ctx: ToolContext) => this.lookups.walletForUser(ctx.userId),
      },
      {
        definition: {
          type: 'function',
          function: {
            name: 'search_help_center',
            description:
              'Search Ore\'s PUBLISHED help centre and legal pages — refunds, delivery times, fees, ' +
              'wallet rules, complaints, terms. THIS IS THE ONLY SOURCE OF POLICY. Call it before answering ' +
              'any question about how Ore works or what a customer is entitled to, and quote what it returns. ' +
              'If it returns nothing, the policy is not written down: say you do not know and escalate. ' +
              'NEVER invent a number, a timeframe or a rule.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'What the customer is asking about, in their words, e.g. "refund policy for a cancelled order"',
                },
              },
              required: ['query'],
            },
          },
        },
        readonly: true,
        // Read-only by construction: ContentService.searchHelp returns PUBLISHED rows only.
        // A draft or an archived article is invisible here, which is what makes unpublishing
        // a policy stop the AI quoting it, with no cache to invalidate.
        execute: (a) => this.content.searchHelp(arg(a, 'query'), 5),
      },
    ];

    // Boot-time guarantee: a non-read-only tool stops the service from starting.
    assertReadOnlySurface(this.tools);

    this.agent = new SupportAgentService(provider, this.tools);
  }

  onModuleInit(): void {
    if (!this.enabled) {
      // Not fatal: support still works, it is just human-only until a key is configured.
      console.warn('[support-ai] AI_API_KEY not set — support AI disabled, human support only');
      return;
    }
    console.log(`[support-ai] ready: provider=${this.providerName} model=${this.model} tools=${this.tools.length} (read-only)`);
  }
}
