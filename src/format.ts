const FAILURE_TAIL_LINES = 50;
const NO_OUTPUT_HINT =
  "Command exited with no stdout or stderr captured. Likely causes: " +
  "working_directory does not exist on the server, or the runner could " +
  "not start the process. Verify the working_directory and command.";

/**
 * Pick the most useful failure context to surface in the GitHub Action's
 * single error annotation when a command fails.
 *
 * Priority: stderr tail > stdout tail > diagnostic hint. The hint case
 * usually indicates a runner-side issue (bad working_directory, spawn
 * failure) — older runners returned empty streams there with no clue.
 */
export function buildFailureSummary(stdout: string, stderr: string): string {
  if (stderr) {
    return stderr.split("\n").slice(-FAILURE_TAIL_LINES).join("\n");
  }
  if (stdout) {
    const tail = stdout.split("\n").slice(-FAILURE_TAIL_LINES).join("\n");
    return `Command failed but stderr was empty. Last lines of stdout:\n${tail}`;
  }
  return NO_OUTPUT_HINT;
}
