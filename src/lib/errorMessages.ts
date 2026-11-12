type ErrorLike = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  error_description?: unknown;
  name?: unknown;
};

const ERROR_CODE_MAP: Record<string, string> = {
  invalid_credentials:
    'Correo o contraseña incorrectos. Si aún no tienes cuenta, usa la pestaña «Crear Cuenta».',
  email_not_confirmed:
    'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o carpeta de spam.',
  user_already_exists: 'Ya existe una cuenta registrada con ese correo electrónico.',
  email_exists: 'Ya existe una cuenta registrada con ese correo electrónico.',
  user_not_found: 'No existe ninguna cuenta registrada con ese correo.',
  weak_password:
    'La contraseña es demasiado débil. Usa al menos 6 caracteres combinando letras y números.',
  same_password: 'La nueva contraseña debe ser diferente a la actual.',
  signup_disabled:
    'El registro de nuevas cuentas está deshabilitado en este proyecto de Supabase.',
  email_provider_disabled:
    'El acceso con correo y contraseña está deshabilitado en Supabase Auth.',
  provider_disabled: 'Este método de acceso está deshabilitado en Supabase Auth.',
  over_email_send_rate_limit:
    'Se superó el límite de envío de correos. Espera unos minutos antes de reintentar.',
  over_request_rate_limit:
    'Demasiados intentos en poco tiempo. Espera unos segundos y vuelve a intentar.',
  validation_failed: 'Algunos de los datos ingresados no son válidos.',
  email_address_invalid: 'El formato del correo electrónico no es válido.',
  email_address_not_authorized:
    'Este correo o dominio no está autorizado en la configuración de Supabase.',
  session_not_found: 'Tu sesión expiró o no se encontró. Vuelve a iniciar sesión.',
  session_expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  refresh_token_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  refresh_token_already_used: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  bad_jwt: 'La sesión actual ya no es válida. Vuelve a iniciar sesión.',
  no_authorization: 'No tienes autorización para realizar esta acción.',
  user_banned: 'Esta cuenta se encuentra suspendida temporalmente.',
  captcha_failed: 'No se pudo completar la verificación de seguridad. Intenta nuevamente.',
  otp_expired: 'El código o enlace de verificación ha expirado. Solicita uno nuevo.',
  otp_disabled: 'La verificación por código está deshabilitada en Supabase.',
  request_timeout: 'El servidor tardó demasiado en responder. Revisa tu conexión e intenta otra vez.',
  hook_timeout: 'El servidor tardó demasiado en responder. Intenta nuevamente.',
  unexpected_failure: 'Ocurrió un error inesperado en el servidor de autenticación.',
  // Postgres / PostgREST
  '42501': 'Permiso denegado por las políticas de seguridad (RLS) de Supabase.',
  PGRST301: 'Tu sesión expiró. Vuelve a iniciar sesión para sincronizar.',
  '23505': 'Ya existe un registro duplicado en la base de datos.',
  '42P01':
    'Faltan tablas en Supabase: ejecuta el script supabase/schema.sql en el SQL Editor.',
  // DOMException
  QuotaExceededError: 'Espacio de almacenamiento local insuficiente en el navegador.',
  NotReadableError: 'El navegador no pudo leer el archivo local seleccionado.',
};

const MESSAGE_PATTERN_MAP: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [
    /invalid login credentials|invalid credentials/i,
    'Correo o contraseña incorrectos. Si aún no tienes cuenta, usa la pestaña «Crear Cuenta».',
  ],
  [
    /email not confirmed/i,
    'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o spam (o desactiva «Confirm email» en Supabase Auth).',
  ],
  [
    /user already registered|already been registered|already registered/i,
    'Ya existe una cuenta registrada con ese correo electrónico.',
  ],
  [
    /password should be at least (\d+) characters/i,
    (m) => `La contraseña debe tener al menos ${m[1]} caracteres.`,
  ],
  [
    /signup requires a valid password/i,
    'Debes ingresar una contraseña válida para crear la cuenta.',
  ],
  [
    /unable to validate email address|invalid email/i,
    'El correo electrónico ingresado no tiene un formato válido.',
  ],
  [
    /for security purposes, you can only request this after (\d+) seconds/i,
    (m) => `Por seguridad, espera ${m[1]} segundos antes de volver a intentarlo.`,
  ],
  [
    /email rate limit exceeded|rate limit/i,
    'Se superó el límite temporal de intentos. Espera unos minutos antes de reintentar.',
  ],
  [
    /signups not allowed/i,
    'El registro de usuarios nuevos está deshabilitado en este proyecto de Supabase.',
  ],
  [
    /email logins are disabled/i,
    'El inicio de sesión con correo está deshabilitado en Supabase Auth.',
  ],
  [
    /anonymous sign-ins are disabled/i,
    'El acceso anónimo está deshabilitado en Supabase Auth.',
  ],
  [
    /database error saving new user/i,
    'Error en Supabase al guardar el usuario (verifica haber ejecutado supabase/schema.sql en el SQL Editor).',
  ],
  [
    /relation ".*" does not exist|could not find the table/i,
    'Faltan tablas en Supabase: ejecuta el script supabase/schema.sql en el SQL Editor de tu proyecto.',
  ],
  [/auth session missing/i, 'No hay una sesión activa en este momento.'],
  [/jwt expired|invalid jwt/i, 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.'],
  [
    /invalid api key|no api key found/i,
    'La clave pública de Supabase (.env) es inválida o no se cargó. Reinicia el servidor tras revisar .env.',
  ],
  [
    /row-level security policy|permission denied/i,
    'Permiso denegado por las políticas de seguridad (RLS) de Supabase.',
  ],
  [
    /bucket not found/i,
    'No se encontró el bucket "study-files" en Supabase Storage (revisa supabase/schema.sql).',
  ],
  [
    /the resource already exists/i,
    'El archivo ya existe en el almacenamiento en la nube.',
  ],
  [
    /payload too large|maximum allowed size/i,
    'El archivo supera el tamaño máximo permitido por Supabase Storage.',
  ],
  [
    /failed to fetch|networkerror|load failed|network request failed|err_name_not_resolved/i,
    'No se pudo conectar con Supabase. Revisa tu conexión a internet y la URL en .env.',
  ],
  [
    /invalid pdf structure|missing pdf|not a pdf/i,
    'El archivo PDF está dañado o no tiene un formato PDF válido.',
  ],
  [
    /no password given|incorrect password|passwordexception/i,
    'El documento PDF está protegido con contraseña y no se puede abrir en el visor.',
  ],
  [/pdf file is empty|zero bytes/i, 'El archivo está vacío (0 bytes).'],
  [
    /can't find end of central directory|corrupted zip|not a zip file/i,
    'El archivo .docx o .pptx está dañado o no corresponde a un documento moderno válido.',
  ],
];

function extractRawDetails(err: unknown): { code: string; name: string; message: string } {
  if (typeof err === 'string') {
    return { code: '', name: '', message: err.trim() };
  }
  if (err && typeof err === 'object') {
    const obj = err as ErrorLike;
    const code = typeof obj.code === 'string' ? obj.code.trim() : '';
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const msgCandidate =
      typeof obj.message === 'string' && obj.message.trim()
        ? obj.message.trim()
        : typeof obj.error_description === 'string'
          ? obj.error_description.trim()
          : '';
    return { code, name, message: msgCandidate };
  }
  return { code: '', name: '', message: '' };
}

function isAlreadySpanish(text: string): boolean {
  if (!text) return false;
  if (/[áéíóúüñ¿¡]/i.test(text)) return true;
  return /^(error al|no se |falta|correo |tu |el archivo|la |los |las |ya existe|por seguridad|límite|debes|permiso|formato|supabase )/i.test(
    text
  );
}

/**
 * Traduce errores técnicos (Supabase Auth/PostgREST/Storage, red, PDF/DOCX/PPTX)
 * a mensajes claros en español para la interfaz.
 */
export function formatErrorMessageEs(
  err: unknown,
  fallback = 'Ocurrió un error inesperado. Intenta nuevamente.'
): string {
  const { code, name, message } = extractRawDetails(err);

  if (code && ERROR_CODE_MAP[code]) {
    return ERROR_CODE_MAP[code];
  }
  if (name && ERROR_CODE_MAP[name]) {
    return ERROR_CODE_MAP[name];
  }

  for (const [pattern, translation] of MESSAGE_PATTERN_MAP) {
    const match = message.match(pattern);
    if (match) {
      return typeof translation === 'function' ? translation(match) : translation;
    }
  }

  if (message && isAlreadySpanish(message)) {
    return message;
  }

  return fallback;
}

