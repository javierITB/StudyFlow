import { describe, it, expect, beforeEach, vi } from 'vitest';

class StorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const localMock = new StorageMock();
const sessionMock = new StorageMock();
vi.stubGlobal('localStorage', localMock);
vi.stubGlobal('sessionStorage', sessionMock);

import {
  hashSecretPbkdf2,
  generateHmacSha256,
  verifyHmacSha256,
  authenticateMasterAdmin,
  getAndVerifyAdminSession,
  clearRateLimit,
  MASTER_ADMIN_USERNAME,
  DEFAULT_MASTER_PASSWORD,
  DEFAULT_MASTER_PIN,
} from '../adminAuth';

describe('adminAuth - Núcleo Criptográfico y Seguridad Master', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearRateLimit();
  });

  it('genera y verifica firmas HMAC-SHA256 válidas', async () => {
    const payload = 'session_123|vicho.root|ROOT_SUPERADMIN|1700000000';
    const secret = 'MasterSecretKey2026';

    const sig = await generateHmacSha256(payload, secret);
    expect(sig).toBeDefined();
    expect(sig.length).toBe(64); // SHA-256 en hexadecimal = 64 caracteres

    const isValid = await verifyHmacSha256(payload, sig, secret);
    expect(isValid).toBe(true);

    // Si se altera el payload en 1 carácter, la verificación debe fallar
    const isCorruptValid = await verifyHmacSha256(payload + '_tampered', sig, secret);
    expect(isCorruptValid).toBe(false);
  });

  it('deriva hashes consistentes con PBKDF2', async () => {
    const secret = 'TestPassword123!';
    const salt = 'random_cryptographic_salt';

    const hash1 = await hashSecretPbkdf2(secret, salt);
    const hash2 = await hashSecretPbkdf2(secret, salt);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('autentica exitosamente al Administrador Master con credenciales y PIN correctos', async () => {
    const result = await authenticateMasterAdmin(
      MASTER_ADMIN_USERNAME,
      DEFAULT_MASTER_PASSWORD,
      DEFAULT_MASTER_PIN
    );

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.role).toBe('ROOT_SUPERADMIN');
    expect(result.session?.signature).toBeDefined();

    // Comprobar que la sesión guardada en sessionStorage es válida
    const verifiedSession = await getAndVerifyAdminSession();
    expect(verifiedSession).not.toBeNull();
    expect(verifiedSession?.username).toBe(MASTER_ADMIN_USERNAME);
  });

  it('deniega acceso y registra intento fallido cuando la contraseña o PIN es erróneo', async () => {
    const resultWrongPass = await authenticateMasterAdmin(
      MASTER_ADMIN_USERNAME,
      'WrongPassword!',
      DEFAULT_MASTER_PIN
    );
    expect(resultWrongPass.success).toBe(false);

    const resultWrongPin = await authenticateMasterAdmin(
      MASTER_ADMIN_USERNAME,
      DEFAULT_MASTER_PASSWORD,
      '000000'
    );
    expect(resultWrongPin.success).toBe(false);
    expect(resultWrongPin.error).toContain('PIN');
  });

  it('detecta alteración o suplantación en sessionStorage e invalida la sesión', async () => {
    // 1. Iniciar sesión legítima
    const result = await authenticateMasterAdmin(
      MASTER_ADMIN_USERNAME,
      DEFAULT_MASTER_PASSWORD,
      DEFAULT_MASTER_PIN
    );
    expect(result.success).toBe(true);

    // 2. Simular un ataque donde un atacante manipula el rol o el nombre en sessionStorage
    const raw = sessionStorage.getItem('sf_admin_secure_session_token');
    expect(raw).not.toBeNull();
    const forged = JSON.parse(raw!);
    forged.username = 'hacker_attacker';
    sessionStorage.setItem('sf_admin_secure_session_token', JSON.stringify(forged));

    // 3. La verificación criptográfica debe detectar la corrupción de la firma y destruir la sesión
    const verified = await getAndVerifyAdminSession();
    expect(verified).toBeNull();
    expect(sessionStorage.getItem('sf_admin_secure_session_token')).toBeNull();
  });
});
