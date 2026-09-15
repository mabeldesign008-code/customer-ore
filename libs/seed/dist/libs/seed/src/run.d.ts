/** Seed runner — fully seeds dev/staging environments (G35). Idempotent: safe to re-run. */
import 'reflect-metadata';
declare function main(): Promise<Record<string, number>>;
/** Exported so a test can run the seeder in-process and assert what it actually wrote. */
export { main as runSeed };
//# sourceMappingURL=run.d.ts.map