import { describe, it, expect } from 'vitest';
import { buildRoutePath, parseRouteFromLocation } from '../routes';

describe('Zone URL routing helpers', () => {
  it('builds canonical paths for each workspace zone', () => {
    expect(buildRoutePath('docs')).toBe('/material');
    expect(buildRoutePath('writer')).toBe('/redaccion');
    expect(buildRoutePath('writer', 'work_123')).toBe('/redaccion/work_123');
    expect(buildRoutePath('pomodoro')).toBe('/pomodoro');
    expect(buildRoutePath('board')).toBe('/pizarra');
  });

  it('parses zone paths and aliases back into modules and workId', () => {
    expect(parseRouteFromLocation('/')).toEqual({ module: 'docs', workId: null });
    expect(parseRouteFromLocation('/material')).toEqual({ module: 'docs', workId: null });
    expect(parseRouteFromLocation('/redaccion')).toEqual({ module: 'writer', workId: null });
    expect(parseRouteFromLocation('/redaccion/work_abc')).toEqual({
      module: 'writer',
      workId: 'work_abc',
    });
    expect(parseRouteFromLocation('/writer')).toEqual({ module: 'writer', workId: null });
    expect(parseRouteFromLocation('/pomodoro')).toEqual({ module: 'pomodoro', workId: null });
    expect(parseRouteFromLocation('/ruta')).toEqual({ module: 'pomodoro', workId: null });
    expect(parseRouteFromLocation('/pizarra')).toEqual({ module: 'board', workId: null });
    expect(parseRouteFromLocation('/board')).toEqual({ module: 'board', workId: null });
  });
});

