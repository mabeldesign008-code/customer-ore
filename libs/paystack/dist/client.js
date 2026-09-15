"use strict";
/** Paystack REST client. Only two money moves: money in (transactions) and money out (refunds/transfers).
 *  Live mode hits the real API; mock mode returns deterministic payloads with a local mock webhook flow. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackClient = exports.PaystackProviderError = exports.PaystackInputError = void 0;
const config_1 = require("@ore/config");
/**
 * Typed failures so HTTP layers can answer with the right status (audit S-12/H-5).
 *
 * Everything used to surface as a bare `Error` → generic 500. A caller could not tell
 * "your input is wrong, never retry" from "Paystack is down, retry", and account-side
 * rejections (e.g. "You cannot initiate third party payouts at this time") registered as
 * 5xx outages on dashboards, burning the error budget for what is a configuration state.
 */
/** The caller's input cannot be satisfied (unparseable destination, malformed reference). Maps to 400. */
class PaystackInputError extends Error {
}
exports.PaystackInputError = PaystackInputError;
/** Paystack parsed the request and said no (business/account rejection). Maps to 400/424 — never 500. */
class PaystackProviderError extends Error {
}
exports.PaystackProviderError = PaystackProviderError;
class PaystackClient {
    env;
    constructor(env = process.env) {
        this.env = env;
    }
    get ore() {
        return (0, config_1.loadEnv)(this.env);
    }
    get isMock() {
        return this.ore.paystackMode === 'mock';
    }
    /**
     * Classify a failed Paystack call (audit S-12). A parsed body with `status:false` is
     * Paystack refusing the operation (bad input on our side, or an account-side block like
     * "cannot initiate third party payouts") — a 4xx-class outcome. Anything else (5xx, no
     * parseable body) stays a plain Error so the HTTP layer treats it as an upstream outage.
     */
    fail(context, res, body) {
        if (body && body.status === false) {
            throw new PaystackProviderError(`${context}: ${body.message ?? 'rejected by Paystack'}`);
        }
        throw new Error(`${context}: HTTP ${res.status} ${body?.message ?? res.statusText}`);
    }
    /**
     * References the mock flow has been told were paid.
     *
     * Static because in mock mode there is no Paystack to hold the state and every client instance
     * must agree; process-local is the right lifetime, since mock mode is single-process by
     * construction (production refuses to run it — see `loadEnv`).
     */
    static mockPaid = new Map();
    /** Mark a reference paid in mock mode, so `verify` reports success for it and nothing else. */
    static markMockPaid(reference, amountPesewas, currency = 'GHS', paidAt = new Date().toISOString()) {
        PaystackClient.mockPaid.set(reference, { amountPesewas, currency, paidAt });
    }
    /** Forget every mock payment. Tests only. */
    static resetMockPaid() {
        PaystackClient.mockPaid.clear();
    }
    async initialize(params) {
        if (this.isMock) {
            return {
                reference: params.reference,
                accessCode: null,
                authorizationUrl: null,
                mode: 'mock',
            };
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/transaction/initialize`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                reference: params.reference,
                amount: params.amountPesewas,
                email: params.email,
                currency: params.currency,
                channels: params.channels,
                metadata: params.metadata,
            }),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack initialize failed', res, body);
        }
        return {
            reference: body.data.reference,
            accessCode: body.data.access_code,
            authorizationUrl: body.data.authorization_url,
            mode: 'live',
        };
    }
    async verify(reference) {
        if (this.isMock) {
            // Mock: the mock webhook flow marks success; if never completed, report abandoned.
            //
            // The comment was right and the code was not — it returned `success` for every reference
            // ever asked about, including ones that had never been initialised. Verify-before-grant is
            // the control that stops a forged webhook conjuring a paid order, and it could therefore
            // never be exercised anywhere except live. `markMockPaid` is called by the mock completion
            // flow; anything else is abandoned, which is what an un-paid Paystack transaction reports.
            const paid = PaystackClient.mockPaid.get(reference);
            return paid
                ? { reference, status: 'success', amountPesewas: paid.amountPesewas, feePesewas: 0, currency: paid.currency, channel: 'mock', paidAt: paid.paidAt }
                : { reference, status: 'abandoned', amountPesewas: 0, feePesewas: 0, currency: this.ore.paystackCurrency, channel: 'mock', paidAt: null };
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
            headers: this.headers(),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail(`Paystack verify failed for ${reference}`, res, { status: body?.status, message: body?.message ?? JSON.stringify(body).slice(0, 200) });
        }
        return {
            reference,
            status: body.data.status,
            amountPesewas: body.data.amount,
            feePesewas: body.data.fees || 0,
            currency: body.data.currency,
            channel: body.data.channel,
            paidAt: body.data.paid_at,
            customerEmail: body.data.customer?.email,
            metadata: body.data.metadata,
        };
    }
    /** Refund a transaction (full or partial). amountPesewas optional → full refund. */
    async refund(transactionReference, amountPesewas, reason) {
        if (this.isMock) {
            return { reference: `RF-${Date.now()}`, status: 'processed', amountPesewas: amountPesewas ?? 0, currency: 'GHS' };
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/refund`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                transaction: transactionReference,
                amount: amountPesewas,
                currency: 'GHS',
                reason: reason ?? 'customer-requested',
            }),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack refund failed', res, { status: body?.status, message: body?.message ?? JSON.stringify(body).slice(0, 200) });
        }
        return {
            reference: body.data.reference,
            status: body.data.status,
            amountPesewas: body.data.amount,
            currency: body.data.currency,
        };
    }
    /** Public: create a Paystack Transfer Recipient for Mobile Money or GHIPSS Bank Account in Ghana. */
    async createRecipient(params) {
        if (this.isMock) {
            return {
                recipientCode: `RCP_${Date.now().toString(36).toUpperCase()}`,
                mode: 'mock',
            };
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/transferrecipient`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                type: params.type,
                name: params.name,
                account_number: params.accountNumber.replace(/[^0-9]/g, ''),
                bank_code: params.bankCode.toUpperCase(),
                currency: params.currency ?? 'GHS',
            }),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack transfer recipient failed', res, body);
        }
        return { recipientCode: body.data.recipient_code, mode: 'live' };
    }
    async transferToRecipient(params) {
        if (this.isMock)
            return { reference: params.reference, status: 'success' };
        const res = await fetch(`${this.ore.paystackBaseUrl}/transfer`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ source: 'balance', reason: params.reason ?? 'Vendor withdrawal', amount: params.amountPesewas, currency: params.currency ?? 'GHS', recipient: params.recipientCode, reference: params.reference, metadata: params.metadata }) });
        const body = await res.json();
        if (!res.ok || !body.status || !body.data)
            this.fail('Paystack transfer failed', res, body);
        return { reference: body.data.reference, status: body.data.status === 'success' ? 'success' : 'processing' };
    }
    async transfer(params) {
        if (this.isMock) {
            return { reference: params.reference, status: 'success' };
        }
        const recipient = await this.createTransferRecipient(params.reference, params.destination);
        const res = await fetch(`${this.ore.paystackBaseUrl}/transfer`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                source: 'balance',
                reason: params.reason ?? 'rider withdrawal',
                amount: params.amountPesewas,
                currency: params.currency,
                recipient: recipient.recipientCode,
                reference: params.reference,
                metadata: params.metadata,
            }),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack transfer failed', res, body);
        }
        return { reference: body.data.reference, status: body.data.status === 'success' ? 'success' : 'processing' };
    }
    async getTransferStatus(reference) {
        if (this.isMock) {
            return { reference, status: 'success' };
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/transfer/verify/${encodeURIComponent(reference)}`, {
            headers: this.headers(),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            return { reference, status: 'processing' };
        }
        const s = body.data.status;
        const status = s === 'success' ? 'success' : s === 'failed' || s === 'reversed' ? 'failed' : 'processing';
        return { reference, status };
    }
    async listGhanaPayoutProviders(type) {
        if (this.isMock) {
            return type === 'mobile_money'
                ? [
                    { name: 'MTN', code: 'MTN', type: 'mobile_money' },
                    { name: 'Telecel', code: 'VOD', type: 'mobile_money' },
                    { name: 'ATMoney', code: 'ATL', type: 'mobile_money' },
                ]
                : [];
        }
        const url = `${this.ore.paystackBaseUrl}/bank?currency=GHS&type=${encodeURIComponent(type)}`;
        const res = await fetch(url, { headers: this.headers() });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack payout-provider lookup failed', res, body);
        }
        return body.data
            .filter((provider) => provider.active !== false && typeof provider.name === 'string' && typeof provider.code === 'string')
            .map((provider) => ({ name: provider.name, code: provider.code, type: provider.type ?? type }));
    }
    /** Live helper: register a transfer recipient ("2332… MOMO MTN" or "… BANK AccountName"). */
    async createTransferRecipient(reference, destination) {
        const momo = destination.match(/^(\+?\d{9,15})\s+MOMO\s+(\w+)/i);
        const bank = destination.match(/^(\d{9,15})\s+BANK\s+(.+)$/i);
        const payload = momo
            ? { type: 'mobile_money', account_number: momo[1].replace(/^\+/, ''), bank_code: momo[2].toUpperCase(), currency: 'GHS', name: `Rider ${reference}` }
            : bank
                ? { type: 'nuban', account_number: bank[1], bank_code: 'GH', currency: 'GHS', name: bank[2] }
                : null;
        if (!payload) {
            // Caller input, not an outage (audit S-12): must surface as 400, never 500.
            throw new PaystackInputError(`Cannot parse payout destination (expected "233… MOMO MTN" or "… BANK Name"): ${destination}`);
        }
        const res = await fetch(`${this.ore.paystackBaseUrl}/transferrecipient`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(payload),
        });
        const body = (await res.json());
        if (!res.ok || !body.status || !body.data) {
            this.fail('Paystack recipient create failed', res, body);
        }
        return { recipientCode: body.data.recipient_code };
    }
    headers() {
        return {
            Authorization: `Bearer ${this.ore.paystackSecretKey}`,
            'Content-Type': 'application/json',
        };
    }
}
exports.PaystackClient = PaystackClient;
//# sourceMappingURL=client.js.map