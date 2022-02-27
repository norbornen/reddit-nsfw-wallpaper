import { plainToInstance } from 'class-transformer';
import logger from 'electron-log';

import agent from '../../http-transport';
import { IPostsRedditResult } from '../common/types';
import { RedditPost } from '../entities/post';

export class SubredditScraper {
  private lastRequestItemName!: string;
  private lastRequestItemTimestamp!: number;

  constructor(public readonly subreddit: string) {}

  async *fetchSubreddit(size = 50) {
    let fetchedPostsCount = 0;
    let fetchedPagesCount = 10;
    let currentAfterValue: string | undefined;

    do {
      const items = await this.doRequest(this.subreddit, 'new', {
        after: currentAfterValue,
      }).catch((err) => {
        logger.error(`[fetchSubreddit] [${this.subreddit}] FAIL`);
        logger.error(err);
        return null;
      });
      if (!items?.data?.children || items.data.children.length === 0) {
        break;
      }

      const { after, children } = items.data;
      const posts = children.reduce<RedditPost[]>((acc, { data: item }) => {
        if (item.is_gallery !== true) {
          const post = plainToInstance(RedditPost, item);
          const ext = post.getFileExtname() || '';
          if (['jpg', 'png'].includes(ext) && post.isHorizontalOrLarge()) {
            acc.push(post);
          }
        }
        return acc;
      }, []);

      if (posts.length > 0) {
        yield posts;
      }

      const newAfterValue = after || children[children.length - 1].data.name;
      if (newAfterValue === currentAfterValue) {
        break;
      }
      currentAfterValue = newAfterValue;
      fetchedPostsCount += posts.length;
    } while (fetchedPagesCount-- > 0 && fetchedPostsCount < size);
  }

  async fetchSubredditUpdates(): Promise<RedditPost[]> {
    const items = await this.doRequest(this.subreddit, 'new', {
      before: this.lastRequestItemName,
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
