import { describe, expect, it, vi } from 'vitest';
import {
  fetchTopCommunityTemplates,
  searchCommunityTemplates,
  publishWorkAsCommunityTemplate,
  rateCommunityTemplate,
} from '../communityTemplates';

// Mock de supabaseClient
vi.mock('../supabaseClient', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'community_templates') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'tpl_1',
                    author_id: 'usr_1',
                    author_name: 'Dr. Turing',
                    author_username: 'alan',
                    title: 'Paper IEEE Inteligencia Artificial',
                    category: 'Ingeniería & Tecnología',
                    technical_profile: 'IEEE Standard',
                    description: 'Estructura formal con dos columnas, resumen y conclusiones.',
                    target_words: 2500,
                    paper_size: 'letter',
                    content_html: '<h1>Paper IEEE</h1>',
                    content_text: 'Paper IEEE',
                    tags: ['ieee', 'ia'],
                    avg_rating: 4.95,
                    rating_count: 20,
                    created_at: '2026-11-18T10:00:00Z',
                    updated_at: '2026-11-18T10:00:00Z',
                  },
                ],
                error: null,
              }),
              or: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { avg_rating: 5.0, rating_count: 1 },
                  error: null,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'tpl_new',
                    author_id: 'usr_2',
                    author_name: 'Ada Lovelace',
                    author_username: 'ada',
                    title: 'Memoria de Tesis',
                    category: 'Metodología',
                    technical_profile: 'Tesis de Grado',
                    description: 'Estructura capitular de tesis.',
                    target_words: 5000,
                    paper_size: 'a4',
                    content_html: '<h1>Tesis</h1>',
                    content_text: 'Tesis',
                    tags: ['tesis'],
                    avg_rating: 0,
                    rating_count: 0,
                    created_at: '2026-11-18T11:00:00Z',
                    updated_at: '2026-11-18T11:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }

        if (table === 'template_ratings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ template_id: 'tpl_1', rating: 5 }],
              error: null,
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {};
      }),
    },
  };
});

describe('communityTemplates', () => {
  it('obtiene el top de plantillas comunitarias mapeando snake_case a camelCase', async () => {
    const top = await fetchTopCommunityTemplates(5, 'usr_current');
    expect(top.length).toBe(1);
    expect(top[0].id).toBe('tpl_1');
    expect(top[0].title).toBe('Paper IEEE Inteligencia Artificial');
    expect(top[0].avgRating).toBe(4.95);
    expect(top[0].ratingCount).toBe(20);
    expect(top[0].userRating).toBe(5);
  });

  it('permite buscar plantillas en el catálogo comunitario', async () => {
    const results = await searchCommunityTemplates({
      query: 'IEEE',
      category: 'Ingeniería & Tecnología',
      sortBy: 'top_rated',
    });
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('Ingeniería & Tecnología');
  });

  it('permite publicar un trabajo como plantilla comunitaria', async () => {
    const published = await publishWorkAsCommunityTemplate({
      title: 'Memoria de Tesis',
      category: 'Metodología',
      technicalProfile: 'Tesis de Grado',
      description: 'Estructura capitular de tesis.',
      targetWords: 5000,
      paperSize: 'a4',
      contentHtml: '<h1>Tesis</h1>',
      authorId: 'usr_2',
      authorName: 'Ada Lovelace',
    });

    expect(published.id).toBe('tpl_new');
    expect(published.title).toBe('Memoria de Tesis');
    expect(published.authorName).toBe('Ada Lovelace');
  });

  it('limita la calificación numérica entre 1 y 5 estrellas', async () => {
    // Si se pasa 10, se clamp a 5
    const res = await rateCommunityTemplate('tpl_1', 'usr_1', 10);
    expect(res.userRating).toBe(5);

    // Si se pasa 0, se clamp a 1
    const res2 = await rateCommunityTemplate('tpl_1', 'usr_1', 0);
    expect(res2.userRating).toBe(1);
  });
});
