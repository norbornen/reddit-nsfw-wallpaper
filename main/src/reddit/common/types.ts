export interface IPost {
  id: string;
  name: string;
  url: string;
  preview?: {
    images?: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
  is_gallery?: boolean;
  created?: number;
  created_utc?: number;
}

export interface IEntityRedditData<T> {
  modhash: string;
  dist: number;
  after: string;
  before: null;
  children: Array<{
    kind: string;
    data: T;
  }>;
}

export interface IPostsRedditResult {
  kind: string;
  data: IEntityRedditData<IPost>;
}
