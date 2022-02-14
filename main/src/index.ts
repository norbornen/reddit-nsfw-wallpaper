import 'reflect-metadata';

import { app, Menu, Tray } from 'electron';
import logger from 'electron-log';

import { appConfig } from './config';
import { WallpaperService } from './wallpaper';

app.setActivationPolicy('prohibited');

let wallpaperService: WallpaperService | undefined;
let tray: Tray | undefined;

(async () => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  await app.whenReady();
  app.dock?.hide();

  wallpaperService = new WallpaperService(
    appConfig.subreddits.boobs,
    30 * 60 * 1000,
  );

  tray = new Tray(appConfig.trayImage);
  const menu = Menu.buildFromTemplate([
    { label: `What's in the picture` },
    {
      label: 'Boobs',
      type: 'radio',
      checked: true,
      click: () => (wallpaperService!.subreddits = appConfig.subreddits.boobs),
    },
    {
      label: 'Balls',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.subreddits = appConfig.subreddits.balls),
    },
    {
      label: 'Pets',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.subreddits = appConfig.subreddits.pets),
    },
    { type: 'separator' },
    { label: `Refresh rate` },
    {
      label: '15s',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 15 * 1000),
    },
    {
      label: '5m',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 5 * 60 * 1000),
    },
    {
      label: '10m',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 10 * 60 * 1000),
    },
    {
      label: '15m',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 15 * 60 * 1000),
    },
    {
      label: '30m',
      type: 'radio',
      checked: true,
      click: () => (wallpaperService!.interval = 30 * 60 * 1000),
    },
    {
      label: '1h',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 60 * 60 * 1000),
    },
    { type: 'separator' },
    { label: `Reddit Wallpapers v${process.env.npm_package_version}` },
    { label: 'Quit', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`Reddit Wallpapers v${process.env.npm_package_version}`);
})().catch(logger.error);

app.on('before-quit', (event) => {
  if (tray || wallpaperService) {
    event.preventDefault();
    tray?.destroy();
    wallpaperService?.destroy().finally(app.quit.bind(app));
    tray = undefined;
    wallpaperService = undefined;
  }
});
