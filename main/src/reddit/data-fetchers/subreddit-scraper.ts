import { plainToInstance } from 'class-transformer';
import logger from 'electron-log';

import agent from '../../http-transport';
import { IPostsRedditResult } from '../common/types';
import { RedditPost } from '../entities/post';

export class SubredditScraper {
  private lastRequestItemName!: string;
  private lastRequestItemTimestamp!: number;

  constructor(
    public readonly subreddit: string,
    private readonly size: number = 50,
  ) {}

  async fetchSubreddit(): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    let count = 10;
    let currentBeforeValue: string | undefined;
    do {
      const items = await this.doRequest(this.subreddit, 'new', {
        before: currentBeforeValue,
      }).catch((err) => {
        logger.error(`[fetchSubreddit] [${this.subreddit}] FAIL`);
        logger.error(err);
        return null;
      });

      if (!items?.data?.children) {
        break;
      }

      const children = items.data.children;
      const lastChild = children[children.length - 1];
      currentBeforeValue = lastChild.data.name;

      children.forEach(({ data: item }) => {
        try {
          if (item.is_gallery !== true) {
            const post = plainToInstance(RedditPost, item);
            if (
              ['jpg', 'png'].includes(post.getFileExtname()!) &&
              post.isHorizontal()
            ) {
              posts.push(post);
            }
          }
        } catch (err) {
          logger.error(err);
        }
      });
    } while (count-- > 0 && posts.length <= this.size);

    return posts;
  }

  async fetchSubredditUpdates(): Promise<RedditPost[]> {
    const items = await this.doRequest(this.subreddit, 'new', {
      after: this.lastRequestItemName,
    }).catch((err) => {
      logger.error(`[fetchSubredditUpdates] [${this.subreddit}] FAIL`);
      logger.error(err);
      return null;
    });

    const posts = items?.data?.children?.reduce<RedditPost[]>(
      (acc, { data: item }) => {
        if (item.is_gallery !== true && item.url?.includes('.jpg')) {
          const post = plainToInstance(RedditPost, item);
          if (post.isHorizontal()) {
            acc.push(post);
          }
        }
        return acc;
      },
      [],
    );

    return posts || [];
  }

  private async doRequest(
    subreddit: string,
    listing: 'hot' | 'new' | 'random' | 'rising' | 'top' | 'live' | null = null,
    {
      after,
      before,
      count,
      limit = 100,
      show = 'all',
    }: {
      after?: string;
      before?: string;
      count?: number;
      limit?: number;
      show?: string;
    } = {},
  ): Promise<IPostsRedditResult> {
    const query = {
      params: { after, before, count, limit, show },
    };
    const result = await agent.get<IPostsRedditResult>(
      `${subreddit}/${listing || ''}.json`,
      query,
    );

    result?.data?.children?.forEach(({ data: { created_utc, name } }) => {
      this.lastRequestItemName ||= name;
      if (created_utc) {
        this.lastRequestItemTimestamp ||= created_utc;
        if (created_utc > this.lastRequestItemTimestamp) {
          this.lastRequestItemTimestamp = created_utc;
          this.lastRequestItemName = name;
        }
      }
    });

    return result;
  }
}
