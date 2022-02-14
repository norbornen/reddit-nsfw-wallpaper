import Cycled from 'cycled';
import logger from 'electron-log';

import { SubredditScraper } from './data-fetchers/subreddit-scraper';
import { RedditPost } from './entities/post';

export class RedditCollection {
  private upgradeInterval = 29 * 60 * 1000; // 29m
  private upgradeTimer!: NodeJS.Timer;

  private scrapers = new Map<string, SubredditScraper>();
  private cycled = new Cycled<RedditPost>([]);
  private names = new Set<string>();

  constructor(public readonly subreddits: Readonly<string[]>) {
    if (!(subreddits.length > 0)) {
      throw new Error('SUBREDDITS_UNDEFINED');
    }

    subreddits.forEach((sr) => {
      if (!this.scrapers.has(sr)) {
        this.scrapers.set(sr, new SubredditScraper(sr, 40));
      }
    });
  }

  get size() {
    return this.cycled.length;
  }

  async next(): Promise<RedditPost | null> {
    if (this.cycled) {
      if (this.cycled.length === 0) {
        await this.init();
      }
      return this.cycled.next();
    }
    return null;
  }

  destroy() {
    if (this.upgradeTimer) {
      clearInterval(this.upgradeTimer);
    }
    if (this.cycled) {
      this.cycled.length = 0;
      this.cycled = undefined as any;
    }
    this.scrapers.clear();
  }

  private async init(): Promise<void> {
    const res = await Promise.allSettled(
      this.subreddits.map((sr) => this.scrapers.get(sr)!.fetchSubreddit()),
    );

    const posts: RedditPost[] = [];
    for (let i = 0; i < res.length; i++) {
      const r = res[i];
      if (r.status === 'fulfilled') {
        posts.push(...(r.value || []));
      } else {
        logger.error(this.subreddits[i], r.reason);
      }
    }

    if (posts.length > 0) {
      posts
        .sort((a, b) => (b.created_utc || 0) - (a.created_utc || 0))
        .forEach((post) => {
          if (!this.names.has(post.name)) {
            this.names.add(post.name);
            this.cycled.push(post);
          }
        });
    }

    this.upgradeTimer = setInterval(
      this.upgrade.bind(this),
      this.upgradeInterval,
    );
  }

  private async upgrade(): Promise<void> {
    const res = await Promise.allSettled(
      this.subreddits.map((sr) =>
        this.scrapers.get(sr)!.fetchSubredditUpdates(),
      ),
    );

    const posts: RedditPost[] = [];
    for (let i = 0; i < res.length; i++) {
      const r = res[i];
      if (r.status === 'fulfilled') {
        posts.push(...(r.value || []));
      } else {
        logger.error(this.subreddits[i], r.reason);
      }
    }

    if (posts.length > 0) {
      posts
        .sort((a, b) => (a.created_utc || 0) - (b.created_utc || 0))
        .forEach((post) => {
          if (!this.names.has(post.name)) {
            this.names.add(post.name);
            this.cycled.unshift(post);
          }
        });
    }
  }
}
