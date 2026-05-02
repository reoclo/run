/**
 * Pick the most useful failure context to surface in the GitHub Action's
 * single error annotation when a command fails.
 *
 * Priority: stderr tail > stdout tail > diagnostic hint. The hint case
 * usually indicates a runner-side issue (bad working_directory, spawn
 * failure) — older runners returned empty streams there with no clue.
 */
export declare function buildFailureSummary(stdout: string, stderr: string): string;
