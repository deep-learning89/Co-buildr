import { classifyBatchIntents } from '@/lib/intent-classifier';

describe('classifyBatchIntents', () => {
  it('returns fallback results when groq client is unavailable', async () => {
    // Create two posts array
    const posts = [
      { id: 'post_1', text: 'Looking for a cofounder for my startup' },
      { id: 'post_2', text: 'What do you think about this idea?' }
    ];

    // Call classifyBatchIntents with those posts
    const results = await classifyBatchIntents('test query', posts);

    // Expects results length to equal 2
    expect(results).toHaveLength(2);
    
    // Expects first result intent to be "discussion"
    expect(results[0].intent).toBe('discussion');
    expect(results[0].summary).toBe('No summary available');
    expect(results[0].relevanceScore).toBe(3);
    expect(results[0].id).toBe('post_1');
  });
});
