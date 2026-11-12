import { describe, expect, it } from 'vitest';
import {
  canDeleteNote,
  canEditNote,
  extractShareTokenFromSearch,
  isEmailIdentifier,
  normalizeUsername,
  validateUsernameFormat,
} from '../collaboration';
import { DocumentRecord, StickyNoteRecord } from '../../types/studyflow';

describe('Collaboration & Username helpers', () => {
  it('normaliza y valida formatos de @username', () => {
    expect(normalizeUsername('  @Vicho_UDp ')).toBe('vicho_udp');
    expect(normalizeUsername('@@Ana_99')).toBe('ana_99');

    expect(validateUsernameFormat('@vicho_udp')).toEqual({
      valid: true,
      normalized: 'vicho_udp',
    });

    expect(validateUsernameFormat('ab').valid).toBe(false);
    expect(validateUsernameFormat('usuario-invalido').valid).toBe(false);
    expect(validateUsernameFormat('admin').valid).toBe(false);
    expect(validateUsernameFormat('studyflow').valid).toBe(false);
  });

  it('distingue correos electrónicos vs identificadores @username', () => {
    expect(isEmailIdentifier('estudiante@udp.cl')).toBe(true);
    expect(isEmailIdentifier('vicho_udp')).toBe(false);
    expect(isEmailIdentifier('@vicho_udp')).toBe(false);
  });

  it('extrae el token de enlaces compartidos (?share=...)', () => {
    expect(extractShareTokenFromSearch('?share=abc123xyz')).toBe('abc123xyz');
    expect(extractShareTokenFromSearch('?foo=1&share=tk_998')).toBe('tk_998');
    expect(extractShareTokenFromSearch('?foo=1')).toBeNull();
    expect(extractShareTokenFromSearch('')).toBeNull();
  });

  it('aplica permisos correctos de edición y moderación en notas compartidas', () => {
    const ownedDoc: DocumentRecord = {
      id: 'doc-1',
      folderId: null,
      name: 'Derecho Civil.pdf',
      fileType: 'pdf',
      size: 1000,
      pageCount: 10,
      currentPage: 1,
      uploadDate: '2026-01-01T00:00:00Z',
      ownerId: 'user-owner',
      sharedRole: 'owner',
    };

    const collabDoc: DocumentRecord = {
      ...ownedDoc,
      sharedRole: 'collaborator',
    };

    const peerSharedNote: StickyNoteRecord = {
      id: 'note-1',
      docId: 'doc-1',
      page: 2,
      xRatio: 0.5,
      yRatio: 0.5,
      content: 'Ojo con este artículo',
      color: 'yellow',
      zone: 'ideas',
      createdAt: '2026-01-01T00:00:00Z',
      userId: 'user-peer',
      authorUsername: 'compa_1',
      isShared: true,
    };

    // Un colaborador no puede editar ni borrar una nota compartida de otro usuario
    expect(canEditNote(peerSharedNote, 'user-other')).toBe(false);
    expect(canDeleteNote(peerSharedNote, collabDoc, 'user-other')).toBe(false);

    // El autor siempre puede editar y borrar su propia nota
    expect(canEditNote(peerSharedNote, 'user-peer')).toBe(true);
    expect(canDeleteNote(peerSharedNote, collabDoc, 'user-peer')).toBe(true);

    // El dueño del documento no edita la nota de otro, pero sí puede moderarla (borrarla)
    expect(canEditNote(peerSharedNote, 'user-owner')).toBe(false);
    expect(canDeleteNote(peerSharedNote, ownedDoc, 'user-owner')).toBe(true);
  });
});

