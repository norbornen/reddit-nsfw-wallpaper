// import { app } from 'electron';
// import logger from 'electron-log';
import path from 'node:path';

interface IAppConfig {
  trayImage: string;
  subreddits: Record<string, string[]>;
}

const trayImageName = process.platform === 'win32' ? '32x32.png' : '16x16.png';
const trayImage = path.join(__dirname, '../../resources/tray/', trayImageName);

export const appConfig: IAppConfig = {
  trayImage,
  subreddits: {
    boobs: [
      'boobs',
      'BustyPetite',
      'BiggerThanYouThought',
      'gonewild',
      'palegirls',
    ],
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
