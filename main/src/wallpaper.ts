import { app } from 'electron';
import logger from 'electron-log';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import wallpaper from 'wallpaper';

import agent from './http-transport';
import { RedditCollection } from './reddit';
import { RedditPost } from './reddit/entities/post';

export class WallpaperService {
  private _interval?: number;

  private collection?: RedditCollection;
  private upgradeTimer?: NodeJS.Timer;

  private fileindex = 0;
  private filename?: string;
  private defaultWallpaper?: string;

  constructor(
    subreddits?: Readonly<string[]>,
    interval: number = 30 * 60 * 1000, // 30m
  ) {
    if (subreddits) {
      this.subreddits = subreddits;
    }
    if (interval) {
      this.interval = interval;
    }
  }

  set subreddits(subreddits: Readonly<string[]>) {
    this.collection?.destroy();
    this.collection = new RedditCollection(subreddits);

    process.nextTick(() => this.init().catch(logger.error));
  }

  get interval() {
    return this._interval!;
  }

  set interval(interval: number) {
    if (Number.isNaN(interval) || interval < 0) {
      throw new Error('INCORRECT_INTERVAL_VALUE');
    }
    if (this._interval !== interval) {
      this._interval = interval;
      if (this.upgradeTimer) {
        clearInterval(this.upgradeTimer);
      }
      if (interval !== Infinity) {
        this.upgradeTimer = setInterval(
          this.nextWallpaper.bind(this),
          interval,
        );
      }
    }
  }

  private get tempDir() {
    return app.getPath('temp');
  }

  async destroy() {
    if (this.upgradeTimer) {
      clearInterval(this.upgradeTimer);
      this.upgradeTimer = undefined;
    }
    if (this.collection) {
      this.collection.destroy();
      this.collection = undefined;
    }
    if (this.defaultWallpaper) {
      await wallpaper
        .set(this.defaultWallpaper, { scale: 'fill', screen: 'all' })
        .catch(() => void true);
    }
    if (this.filename) {
      this.unlink(this.filename);
    }
  }

  private async init(): Promise<void> {
    if (!this.defaultWallpaper) {
      try {
        this.defaultWallpaper =
          (await wallpaper.get()) ||
          (await wallpaper.get({ screen: 'all' }))?.[0];
      } catch (err) {
        logger.error(err);
      }
    }
    await this.nextWallpaper();
  }

  async nextWallpaper(): Promise<void> {
    const post = await this.collection?.next();
    if (post?.url) {
      await this.setupWallpaper(post);
    }
  }

  async previousWallpaper(): Promise<void> {
    const post = await this.collection?.previous();
    if (post?.url) {
      await this.setupWallpaper(post);
    }
  }

  private async setupWallpaper(post: RedditPost): Promise<void> {
    const previousFilename = this.filename;
    const fileExtname = (post.getFileExtname() || 'jpg').toLocaleLowerCase();
    const filename = `dpk-wallpaper-${this.fileindex++}.${fileExtname}`;
    try {
      this.unlink(filename);
      const filepath = path.join(this.tempDir, filename);
      const dataStream = await agent.stream(post.url);
      const writeStream = fs.createWriteStream(filepath);
      await pipeline(dataStream, writeStream);

      this.filename = filename;

      await wallpaper.set(filepath, { scale: 'fill', screen: 'all' });

      if (previousFilename) {
        this.unlink(previousFilename);
      }
    } catch (err) {
      logger.error(err);
    }
  }

  private unlink(filename: string): void {
    const filepath = path.join(this.tempDir, filename);
    try {
      fs.unlinkSync(filepath);
    } catch {}
  }
}
