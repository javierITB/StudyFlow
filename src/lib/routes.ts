import type { AppModule } from '../components/Navbar';

export interface ParsedAppRoute {
  module: AppModule;
  workId: string | null;
}

const MODULE_PATH_MAP: Record<AppModule, string> = {
  docs: '/material',
  writer: '/redaccion',
  pomodoro: '/pomodoro',
  board: '/pizarra',
};

export function buildRoutePath(module: AppModule, workId?: string | null): string {
  const base = MODULE_PATH_MAP[module] || '/material';
  if (module === 'writer' && workId) {
    return `${base}/${encodeURIComponent(workId)}`;
  }
  return base;
}

export function parseRouteFromLocation(pathname: string): ParsedAppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const segments = clean.split('/').filter(Boolean);
  const first = (segments[0] || '').toLowerCase();

  if (first === 'redaccion' || first === 'writer') {
    const workId = segments[1] ? decodeURIComponent(segments[1]) : null;
    return { module: 'writer', workId };
  }
  if (first === 'pomodoro' || first === 'ruta') {
    return { module: 'pomodoro', workId: null };
  }
  if (first === 'pizarra' || first === 'board') {
    return { module: 'board', workId: null };
  }
  return { module: 'docs', workId: null };
}
