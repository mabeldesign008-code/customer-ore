/** Feature flags — Redis KV (`ore:flag:<name>`) with an in-process fallback.
 *  Exposed by the gateway at GET/PUT /flags (admin-guarded). Flags let ops flip
 *  behaviors (e.g. catalog caching) without a deploy. */
export interface FlagValue {
    value: string | boolean | number;
    updatedAt: string;
}
export interface FlagsService {
    get(name: string): Promise<FlagValue | null>;
    set(name: string, value: string | boolean | number): Promise<void>;
    all(): Promise<Record<string, FlagValue>>;
}
export declare class RedisFlagsService implements FlagsService {
    private readonly redis;
    private readonly fallback;
    constructor(redisUrl: string);
    private parse;
    get(name: string): Promise<FlagValue | null>;
    set(name: string, value: string | boolean | number): Promise<void>;
    all(): Promise<Record<string, FlagValue>>;
}
export declare function flagsProvider(env?: Record<string, string | undefined>): {
    provide: string;
    useFactory: () => RedisFlagsService;
};
export declare const ORE_FLAGS_TOKEN = "ORE_FLAGS";
//# sourceMappingURL=flags.d.ts.map