describe('runTrudaxRedditScraper integration', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns mapped Reddit post items from public JSON (happy path)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          children: [
            {
              data: {
                id: 'abc123',
                title: 'Looking for cofounder',
                selftext: 'Building a SaaS MVP',
                ups: 42,
                author: 'builder_user',
                num_comments: 10,
                url: 'https://www.reddit.com/r/startups/comments/abc123',
                created_utc: 1713945600,
                subreddit: 'startups',
              },
            },
          ],
        },
      }),
    });

    const { runTrudaxRedditScraper } = await import('@/apify/helpers');
    const results = await runTrudaxRedditScraper({
      searches: ['startups'],
      proxy: { useApifyProxy: true },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'abc123',
      title: 'Looking for cofounder',
      username: 'builder_user',
      dataType: 'post',
    });
  });

  it('returns empty array when Reddit children are empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          children: [],
        },
      }),
    });

    const { runTrudaxRedditScraper } = await import('@/apify/helpers');
    const results = await runTrudaxRedditScraper({
      searches: ['startups'],
      proxy: { useApifyProxy: true },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });
});
