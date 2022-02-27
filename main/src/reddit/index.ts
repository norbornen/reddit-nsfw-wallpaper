import Cycled from 'cycled';
import logger from 'electron-log';

import { SubredditScraper } from './data-fetchers/subreddit-scraper';
import { RedditPost } from './entities/post';

export class RedditCollection {
  private upgradeInterval = 29 * 60 * 1000; // 29m
  private upgradeTimer?: NodeJS.Timer;

  private scrapers = new Map<string, SubredditScraper>();
  private cycled? = new Cycled<RedditPost>([]);
  private names = new Set<string>();

  constructor(public readonly subreddits: Readonly<string[]>) {
    if (!(subreddits.length > 0)) {
      throw new Error('SUBREDDITS_UNDEFINED');
    }

    subreddits.forEach((sr) => {
      if (!this.scrapers.has(sr)) {
        this.scrapers.set(sr, new SubredditScraper(sr));
      }
    });
  }

  get size() {
    return this.cycled?.length;
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

  async previous(): Promise<RedditPost | null> {
    if (this.cycled && this.cycled.length > 0) {
      return this.cycled.previous();
    }
    return null;
  }

  destroy() {
    if (this.upgradeTimer) {
      clearInterval(this.upgradeTimer);
      this.upgradeTimer = undefined;
    }
    if (this.cycled) {
      this.cycled.length = 0;
      this.cycled = undefined;
    }
    this.scrapers.clear();
    this.names.clear();
  }

  private async init(): Promise<void> {
    return new Promise(async (resolve) => {
      for (const sr of this.subreddits) {
        const scraper = this.scrapers.get(sr);
        if (scraper) {
          for await (const posts of scraper.fetchSubreddit()) {
            if (posts?.length > 0) {
              posts.forEach((post) => {
                if (!this.names.has(post.name) && this.cycled) {
                  this.names.add(post.name);
                  this.cycled.push(post);
                }
              });
              resolve();
            }
          }
        }
      }
      logger.log(
        `init "${this.subreddits.join(', ')}", ${this.cycled?.length || 0}`,
      );

      if (this.cycled && this.cycled.length > 0) {
        this.cycled?.sort(
          (a, b) => (b.created_utc || 0) - (a.created_utc || 0),
        );
        if (this.cycled.length > 10) {
          this.cycled.index = 0;
        }
      }

      this.upgradeTimer = setInterval(
        this.upgrade.bind(this),
        this.upgradeInterval,
      );
    });
  }

  private async upgrade(): Promise<void> {
    const posts = (
      await Promise.all(
        this.subreddits.map((sr) =>
          this.scrapers.get(sr)!.fetchSubredditUpdates(),
        ),
      )
    ).flat();
    logger.log(
      `upgrade "${this.subreddits.join(', ')}", ${this.cycled?.length || 0}`,
    );

    if (posts.length > 0 && this.cycled) {
      posts
        .sort((a, b) => (a.created_utc || 0) - (b.created_utc || 0))
        .forEach((post) => {
          if (!this.names.has(post.name)) {
            this.names.add(post.name);
            this.cycled!.unshift(post);
          }
        });
    }
  }
}
