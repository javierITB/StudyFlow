import { describe, it, expect, beforeEach, vi } from 'vitest';

class StorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const localMock = new StorageMock();
vi.stubGlobal('localStorage', localMock);

// Tablas mutables para simular la persistencia de Supabase en pruebas unitarias
let mockProfiles: any[] = [];
let mockDocs: any[] = [];
let mockWorks: any[] = [];
let mockTemplates: any[] = [];
let mockFeedback: any[] = [];

function resetMockDb() {
  mockProfiles = [
    {
      id: 'usr_mock_1',
      full_name: 'Vicente Torres',
      email: 'vichojavier2003@gmail.com',
      username: 'az_heis',
      updated_at: '2026-11-19T20:00:00Z',
    },
    {
      id: 'usr_mock_2',
      full_name: 'Valentina Santibáñez',
      email: 'valentina.santibanez@mail.udp.cl',
      username: 'tupolola_teamamusho',
      updated_at: '2026-11-18T15:00:00Z',
    },
  ];

  mockDocs = [
    {
      id: 'doc_1',
      user_id: 'usr_mock_1',
      name: 'Manual_Operativo.pdf',
      file_type: 'pdf',
      size: 1195376,
      upload_date: '2026-11-19T10:00:00Z',
    },
  ];

  mockWorks = [
    {
      id: 'work_1',
      user_id: 'usr_mock_1',
      title: 'Manual de Uso Solunex',
      content_html: '<h1>Manual Solunex</h1><p>Contenido detallado...</p>',
      word_count: 26864,
      created_at: '2026-11-19T12:00:00Z',
    },
  ];

  mockTemplates = [
    {
      id: 'tpl_1',
      title: 'Ensayo Académico Estándar',
      author_name: 'Vicente Torres',
      author_id: 'usr_mock_1',
      category: 'Tesis & Ensayos',
      technical_profile: 'Formato APA 7ma',
      target_words: 3500,
      paper_size: 'letter',
      avg_rating: 4.8,
      rating_count: 12,
      downloads_count: 48,
      status: 'published',
      content_html: '<h1>Ensayo</h1>',
      tags: ['ensayo', 'apa'],
      created_at: '2026-11-18T10:00:00Z',
      updated_at: '2026-11-18T10:00:00Z',
    },
  ];

  mockFeedback = [
    {
      id: 'sug_1',
      title: 'Añadir modo noche para visor de hojas',
      author_name: 'Valentina Santibáñez',
      author_email: 'valentina.santibanez@mail.udp.cl',
      category: 'redaccion',
      priority: 'alta',
      status: 'pendiente',
      description: 'Sería excelente tener un fondo oscuro suave al redactar de noche.',
      votes: 5,
      created_at: '2026-11-19T14:00:00Z',
      updated_at: '2026-11-19T14:00:00Z',
    },
  ];
}

vi.mock('../supabaseClient', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      rpc: vi.fn((fnName: string) => {
        if (fnName === 'get_admin_portal_data') {
          return Promise.resolve({
            data: {
              users: mockProfiles.map((p) => ({
                id: p.id,
                fullName: p.full_name,
                email: p.email,
                username: p.username,
                role: p.username === 'az_heis' ? 'researcher' : 'student',
                status: 'active',
                storageBytes: 1195376,
                quotaBytes: 1073741824,
                documentsCount: 1,
                worksCount: 1,
                notesCount: 0,
                topFiles: [{ name: 'Manual_Operativo.pdf', size: 1195376, type: 'pdf' }],
              })),
              templates: mockTemplates.map((t) => ({
                id: t.id,
                title: t.title,
                authorName: t.author_name,
                authorId: t.author_id,
                category: t.category,
                technicalProfile: t.technical_profile,
                targetWords: t.target_words,
                paperSize: t.paper_size,
                avgRating: t.avg_rating,
                ratingCount: t.rating_count,
                downloadsCount: t.downloads_count,
                status: t.status,
                contentHtml: t.content_html,
                tags: t.tags,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
              })),
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() => Promise.resolve({ data: [...mockProfiles], error: null })),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                mockProfiles = mockProfiles.filter((p) => p.id !== val);
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }
        if (table === 'documents') {
          return {
            select: vi.fn().mockImplementation(() => Promise.resolve({ data: [...mockDocs], error: null })),
          };
        }
        if (table === 'study_works') {
          return {
            select: vi.fn().mockImplementation(() => Promise.resolve({ data: [...mockWorks], error: null })),
          };
        }
        if (table === 'notes') {
          return {
            select: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
          };
        }
        if (table === 'community_templates') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() => Promise.resolve({ data: [...mockTemplates], error: null })),
            }),
            update: vi.fn().mockImplementation((fields: any) => ({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                const target = mockTemplates.find((t) => t.id === val);
                if (target) Object.assign(target, fields);
                return Promise.resolve({ error: null });
              }),
            })),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                mockTemplates = mockTemplates.filter((t) => t.id !== val);
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }
        if (table === 'system_feedback') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() => Promise.resolve({ data: [...mockFeedback], error: null })),
            }),
            insert: vi.fn().mockImplementation((item: any) => {
              mockFeedback.unshift(item);
              return Promise.resolve({ error: null });
            }),
            update: vi.fn().mockImplementation((fields: any) => ({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                const target = mockFeedback.find((f) => f.id === val);
                if (target) Object.assign(target, fields);
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        return {
          select: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
        };
      }),
    },
  };
});

// Mock de localDb
vi.mock('../localDb', () => ({
  dbGetAll: vi.fn().mockResolvedValue([]),
}));

import {
  formatBytes,
  getAdminUsers,
  updateUserStatus,
  updateUserQuota,
  getAdminSuggestions,
  updateSuggestionStatus,
  submitUserFeedback,
  getAdminTemplates,
  updateTemplateStatus,
  deleteTemplateAdmin,
  computeWebUsageMetrics,
  getAdminSystemSettings,
  updateAdminSystemSettings,
} from '../adminData';

describe('adminData - Motor de Gobernanza y Métricas Reales', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMockDb();
  });

  it('formatea bytes correctamente en KB, MB y GB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(5368709120)).toBe('5 GB');
  });

  it('obtiene lista de usuarios reales y permite cambiar el estado (dar de baja y reactivar)', async () => {
    const users = await getAdminUsers();
    expect(users.length).toBeGreaterThan(0);

    const firstUser = users[0];
    expect(firstUser.status).toBe('active');
    expect(firstUser.email).toContain('@');

    // Dar de baja al usuario con motivo
    const updatedUsers = await updateUserStatus(firstUser.id, 'suspended', 'Infracción de políticas');
    const suspendedUser = updatedUsers.find((u) => u.id === firstUser.id);
    expect(suspendedUser?.status).toBe('suspended');
    expect(suspendedUser?.suspensionReason).toBe('Infracción de políticas');

    // Reactivar usuario
    const reactivatedUsers = await updateUserStatus(firstUser.id, 'active');
    const activeUser = reactivatedUsers.find((u) => u.id === firstUser.id);
    expect(activeUser?.status).toBe('active');
    expect(activeUser?.suspensionReason).toBeUndefined();
  });

  it('permite actualizar cuota de almacenamiento de un usuario', async () => {
    const users = await getAdminUsers();
    const user = users[0];

    const newQuota = 10737418240; // 10 GB
    const updated = await updateUserQuota(user.id, newQuota);
    const updatedUser = updated.find((u) => u.id === user.id);

    expect(updatedUser?.quotaBytes).toBe(newQuota);
  });

  it('gestiona sugerencias de estudiantes y actualización de notas administrativas', async () => {
    const suggestions = await getAdminSuggestions();
    expect(suggestions.length).toBeGreaterThan(0);

    const firstSug = suggestions[0];
    const updated = await updateSuggestionStatus(
      firstSug.id,
      'aprobada',
      'Aprobado para la versión 2.5'
    );
    const target = updated.find((s) => s.id === firstSug.id);

    expect(target?.status).toBe('aprobada');
    expect(target?.adminNotes).toBe('Aprobado para la versión 2.5');
  });

  it('permite a un usuario enviar una nueva sugerencia u opinión desde la web base', async () => {
    const newFeedback = await submitUserFeedback({
      title: 'Botón de exportar a formato Markdown directo',
      description: 'Facilitaría respaldar trabajos en repositorios git personales.',
      category: 'redaccion',
      priority: 'media',
      authorName: 'Vicente Torres',
      authorEmail: 'vichojavier2003@gmail.com',
      userId: 'usr_mock_1',
    });

    expect(newFeedback.id).toBeDefined();
    expect(newFeedback.title).toBe('Botón de exportar a formato Markdown directo');
    expect(newFeedback.status).toBe('pendiente');

    const allSuggestions = await getAdminSuggestions();
    expect(allSuggestions.some((s) => s.title.includes('Markdown'))).toBe(true);
  });

  it('modera plantillas comunitarias reales (destacar y archivar)', async () => {
    const templates = await getAdminTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const tpl = templates[0];
    const featured = await updateTemplateStatus(tpl.id, 'featured');
    expect(featured.find((t) => t.id === tpl.id)?.status).toBe('featured');

    const archived = await updateTemplateStatus(tpl.id, 'archived', 'Contenido duplicado');
    expect(archived.find((t) => t.id === tpl.id)?.status).toBe('archived');
  });

  it('elimina permanentemente una plantilla comunitaria', async () => {
    const templates = await getAdminTemplates();
    expect(templates.length).toBeGreaterThan(0);

    const targetId = templates[0].id;
    const remaining = await deleteTemplateAdmin(targetId);
    expect(remaining.some((t) => t.id === targetId)).toBe(false);

    const checkList = await getAdminTemplates();
    expect(checkList.some((t) => t.id === targetId)).toBe(false);
  });

  it('calcula métricas globales de telemetría y desglose de almacenamiento', async () => {
    const metrics = await computeWebUsageMetrics();

    expect(metrics.totalUsers).toBeGreaterThan(0);
    expect(metrics.totalStorageUsedBytes).toBeGreaterThan(0);
    expect(metrics.totalStorageLimitBytes).toBeGreaterThan(0);
    expect(metrics.storageByType.pdf).toBeGreaterThan(0);
    expect(metrics.moduleActivityPercentage.writer).toBeGreaterThan(0);
    expect(metrics.dailyActivityLast7Days.length).toBe(7);
  });

  it('gestiona la configuración dinámica de umbrales y auto-bloqueo', () => {
    const defaultSettings = getAdminSystemSettings();
    expect(defaultSettings.storageWarningPercent).toBe(75);
    expect(defaultSettings.storageCriticalPercent).toBe(90);
    expect(defaultSettings.autoLockTimeoutMinutes).toBe(15);

    const updated = updateAdminSystemSettings({
      storageWarningPercent: 80,
      storageCriticalPercent: 95,
      autoLockTimeoutMinutes: 30,
    });

    expect(updated.storageWarningPercent).toBe(80);
    expect(updated.storageCriticalPercent).toBe(95);
    expect(updated.autoLockTimeoutMinutes).toBe(30);

    const retrieved = getAdminSystemSettings();
    expect(retrieved.storageWarningPercent).toBe(80);
    expect(retrieved.autoLockTimeoutMinutes).toBe(30);
  });
});
