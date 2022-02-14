import logger from 'electron-log';
import path from 'node:path';
import { URL } from 'node:url';

export class RedditPost {
  id!: string;
  name!: string;
  url!: string;
  preview?: {
    images?: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
  created?: number;
  created_utc!: number;

  isHorizontal(): boolean {
    try {
      const pathname = new URL(this.url).pathname;
      const source = this.preview?.images?.find((x) =>
        x.source?.url?.includes(pathname),
      )?.source;
      if (source && source?.width > source?.height) {
        return true;
      }
    } catch (err) {
      logger.error(this.url);
      logger.error(err);
    }
    return false;
  }

  getFileName(): string | null {
    try {
      const pathname = new URL(this.url).pathname;
      if (pathname) {
        return path.basename(pathname);
      }
    } catch (err) {
      logger.error(this.url);
      logger.error(err);
    }
    return null;
  }

  getFileExtname(): string | null {
    const filename = this.getFileName();
    if (filename) {
      return path.extname(filename).replace(/^\./, '');
    }
    return null;
  }
}
