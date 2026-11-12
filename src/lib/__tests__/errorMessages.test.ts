import { describe, expect, it } from 'vitest';
import { formatErrorMessageEs } from '../errorMessages';

describe('formatErrorMessageEs', () => {
  it('traduce errores comunes de Supabase Auth por mensaje y por codigo', () => {
    expect(
      formatErrorMessageEs(new Error('Invalid login credentials'))
    ).toContain('Correo o contraseña incorrectos');

    expect(
      formatErrorMessageEs({ code: 'email_not_confirmed', message: 'Email not confirmed' })
    ).toContain('no ha sido confirmado');

    expect(
      formatErrorMessageEs(new Error('Password should be at least 8 characters.'))
    ).toBe('La contraseña debe tener al menos 8 caracteres.');

    expect(
      formatErrorMessageEs(
        new Error('For security purposes, you can only request this after 42 seconds.')
      )
    ).toContain('42 segundos');
  });

  it('traduce errores de red y de base de datos/parsers en ingles', () => {
    expect(formatErrorMessageEs(new TypeError('Failed to fetch'))).toContain(
      'No se pudo conectar con Supabase'
    );

    expect(
      formatErrorMessageEs({ code: '42P01', message: 'relation "folders" does not exist' })
    ).toContain('supabase/schema.sql');

    expect(
      formatErrorMessageEs(new Error('Invalid PDF structure.'))
    ).toContain('PDF está dañado');
  });

  it('conserva mensajes propios ya escritos en espanol y usa fallback para ingles desconocido', () => {
    expect(
      formatErrorMessageEs(new Error('No se encontraron diapositivas válidas en el archivo .pptx'))
    ).toBe('No se encontraron diapositivas válidas en el archivo .pptx');

    expect(
      formatErrorMessageEs(new Error('Some unexpected internal stack detail'), 'Error al autenticar')
    ).toBe('Error al autenticar');
  });
});

