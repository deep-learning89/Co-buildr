export type TrudaxRedditSort = '' | 'relevance' | 'hot' | 'top' | 'new' | 'rising' | 'comments';

export type TrudaxRedditTime = 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';

export type TrudaxRedditDataType = 'post' | 'comment' | 'community' | 'user';

export interface TrudaxStartUrl {
  url: string;
}

export interface TrudaxProxyConfig {
  useApifyProxy: boolean;
  apifyProxyGroups?: string[];
}

export interface TrudaxRedditScraperInput {
  startUrls?: TrudaxStartUrl[];
  skipComments?: boolean;
  skipUserPosts?: boolean;
  skipCommunity?: boolean;
  searches?: string[];
  searchCommunityName?: string;
  ignoreStartUrls?: boolean;
  searchPosts?: boolean;
  searchComments?: boolean;
  searchCommunities?: boolean;
  searchUsers?: boolean;
  sort?: TrudaxRedditSort;
  time?: TrudaxRedditTime;
  includeNSFW?: boolean;
  maxItems?: number;
  maxPostCount?: number;
  postDateLimit?: string;
  commentDateLimit?: string;
  maxComments?: number;
  maxCommunitiesCount?: number;
  maxUserCount?: number;
  scrollTimeout?: number;
  proxy: TrudaxProxyConfig;
  debugMode?: boolean;
}

export interface TrudaxRedditBaseOutputItem {
  id: string;
  url: string;
  createdAt?: string;
  scrapedAt?: string;
  dataType: TrudaxRedditDataType;
}

export interface TrudaxRedditPostOutput extends TrudaxRedditBaseOutputItem {
  dataType: 'post';
  parsedId?: string;
  username?: string;
  title?: string;
  communityName?: string;
  parsedCommunityName?: string;
  body?: string;
  html?: string | null;
  numberOfComments?: number;
  upVotes?: number;
  authorFlair?: string | null;
  isVideo?: boolean;
  isAd?: boolean;
  over18?: boolean;
}

export interface TrudaxRedditCommentOutput extends TrudaxRedditBaseOutputItem {
  dataType: 'comment';
  parsedId?: string;
  parentId?: string;
  username?: string;
  authorFlair?: string | null;
  category?: string;
  communityName?: string;
  body?: string;
  upVotes?: number;
  numberOfreplies?: number;
  html?: string | null;
}

export interface TrudaxRedditCommunityOutput extends TrudaxRedditBaseOutputItem {
  dataType: 'community';
  name?: string;
  title?: string;
  headerImage?: string;
  description?: string;
  over18?: boolean;
  numberOfMembers?: number;
}

export interface TrudaxRedditUserOutput extends TrudaxRedditBaseOutputItem {
  dataType: 'user';
  username?: string;
  userIcon?: string;
  postKarma?: number;
  commentKarma?: number;
  description?: string;
  over18?: boolean;
}

export type TrudaxRedditOutputItem =
  | TrudaxRedditPostOutput
  | TrudaxRedditCommentOutput
  | TrudaxRedditCommunityOutput
  | TrudaxRedditUserOutput;

export interface InternalRedditResult {
  id: string;
  title: string;
  body: string;
  text: string;
  subreddit: string;
  upvotes: number;
  url: string;
  link: string;
  author: string;
  created_at: string;
}
