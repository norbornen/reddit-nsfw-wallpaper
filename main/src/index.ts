import 'reflect-metadata';

import { app, Menu, MenuItemConstructorOptions, Tray } from 'electron';
import logger from 'electron-log';

import { appConfig } from './config';
import { WallpaperService } from './wallpaper';

let wallpaperService: WallpaperService | undefined;
let tray: Tray | undefined;

(async () => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  if (process.platform === 'darwin') {
    app.setActivationPolicy('prohibited');
  }

  await app.whenReady();
  app.dock?.hide();

  wallpaperService = new WallpaperService(
    appConfig.subreddits.boobs,
    1 * 60 * 1000,
  );

  let lastIntervalValue: number | undefined;
  const menuTemplate: MenuItemConstructorOptions[] = [
    { label: `What's in the picture`, enabled: false },
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
    { label: `Refresh rate`, enabled: false },
    {
      label: '15s',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 15 * 1000),
    },
    {
      label: '1m',
      type: 'radio',
      checked: true,
      click: () => (wallpaperService!.interval = 1 * 60 * 1000),
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
      label: '30m',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 30 * 60 * 1000),
    },
    {
      label: '1h',
      type: 'radio',
      checked: false,
      click: () => (wallpaperService!.interval = 60 * 60 * 1000),
    },
    { type: 'separator' },
    {
      label: 'Next',
      click: () => wallpaperService!.nextWallpaper(),
    },
    {
      label: 'Previous',
      click: () => wallpaperService!.previousWallpaper(),
    },
    {
      label: 'Pause',
      type: 'radio',
      checked: false,
      click: () => {
        lastIntervalValue = wallpaperService!.interval;
        wallpaperService!.interval = Infinity;
      },
    },
    {
      label: 'Continue',
      type: 'radio',
      checked: true,
      click: () => {
        wallpaperService!.nextWallpaper();
        wallpaperService!.interval = lastIntervalValue || 60 * 1000;
      },
    },
    { type: 'separator' },
    { label: `Reddit Wallpapers v${appConfig.version}` },
    { label: 'Quit', role: 'quit' },
  ];

  tray = new Tray(appConfig.trayImage);
  const menu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(menu);
  tray.setToolTip(`Reddit Wallpapers v${appConfig.version}`);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => tray?.popUpContextMenu());
})().catch(logger.error);

app.on('before-quit', (event) => {
  if (tray || wallpaperService) {
    event.preventDefault();
    tray?.removeAllListeners();
    tray?.destroy();
    wallpaperService?.destroy().finally(app.quit.bind(app));
    tray = undefined;
    wallpaperService = undefined;
  }
});
