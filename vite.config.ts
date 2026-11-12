import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

  export default defineConfig(({ mode }) => {
    // Carga variables locales (.env/.env.local) y de entorno CI (Vercel) para
    // exponer solo las claves publicas de Supabase sin filtrar claves privadas
    // como SUPABASE_SERVICE_ROLE_KEY.
    const loaded = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_']);
    const pickPublic = (key: string): string =>
      (loaded[key] || process.env[key] || '').trim();

    const supabaseUrl =
      pickPublic('VITE_SUPABASE_URL') ||
      pickPublic('NEXT_PUBLIC_SUPABASE_URL') ||
      pickPublic('SUPABASE_URL');

    const supabasePublishableKey =
      pickPublic('VITE_SUPABASE_PUBLISHABLE_KEY') ||
      pickPublic('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
      pickPublic('SUPABASE_PUBLISHABLE_KEY');

    const supabaseAnonKey =
      pickPublic('VITE_SUPABASE_ANON_KEY') ||
      pickPublic('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      pickPublic('SUPABASE_ANON_KEY');

    return {
      plugins: [react()],
      envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
      define: {
        'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
        'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      },
      optimizeDeps: {
        include: ['pdfjs-dist'],
      },
    };
  });

