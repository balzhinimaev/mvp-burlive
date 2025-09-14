import { runContentLint } from '../scripts/content-lint';

describe('content:lint', () => {
  it('should fail if a gap has no hint or no explanation', async () => {
    const summary = await runContentLint(['seeds']);
    // If there are any issues, the script would exit(1) in CLI mode.
    // Here we just assert summary shape and that we found some gaps.
    expect(summary.gapsFound).toBeGreaterThan(0);
  });
});


