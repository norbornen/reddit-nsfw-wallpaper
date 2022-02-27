import { app } from 'electron';
import path from 'node:path';

interface IAppConfig {
  version?: string;
  trayImage: string;
  subreddits: Record<string, string[]>;
}

const trayImageName = process.platform === 'win32' ? '32x32.png' : '16x16.png';
const trayImage = path.join(__dirname, '../../resources/tray/', trayImageName);

export const appConfig: IAppConfig = {
  version: app.getVersion() || process.env.npm_package_version,
  trayImage,
  subreddits: {
    boobs: ['nipples', 'boobs', 'small', 'BustyPetite', 'palegirls'],
    balls: ['dickpic', 'penis', 'softies', 'balls', 'ratemycock', 'cock'],
    pets: [
      'NatureIsFuckingLit',
      'AnimalsBeingJerks',
      'Catloaf',
      'TheCatDimension',
      'SEUT',
      'RarePuppers',
      'Cats',
      'Kitten',
    ],
  },
};
