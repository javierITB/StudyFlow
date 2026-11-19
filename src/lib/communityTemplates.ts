import { supabase, isSupabaseConfigured } from './supabaseClient';
import { CommunityTemplateRecord } from '../types/studyflow';

export interface PublishTemplateParams {
  title: string;
  category: string;
  technicalProfile: string;
  description: string;
  targetWords?: number;
  paperSize?: 'letter' | 'legal' | 'a4';
  contentHtml: string;
  contentText?: string;
  tags?: string[];
  authorId: string;
  authorName: string;
  authorUsername?: string | null;
}

export interface SearchCommunityTemplatesOptions {
  query?: string;
  category?: string;
  sortBy?: 'top_rated' | 'recent' | 'popular';
  limit?: number;
  userId?: string | null;
}

// Convertir fila Supabase (snake_case) a CommunityTemplateRecord (camelCase)
function mapRowToTemplate(row: any, userRating: number | null = null): CommunityTemplateRecord {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name || 'Autor de la comunidad',
    authorUsername: row.author_username || null,
    title: row.title || 'Plantilla sin título',
    category: row.category || 'General',
    technicalProfile: row.technical_profile || 'General',
    description: row.description || '',
    targetWords: Number(row.target_words) || 0,
    paperSize: row.paper_size || 'letter',
    contentHtml: row.content_html || '',
    contentText: row.content_text || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    avgRating: Number(row.avg_rating) || 0.0,
    ratingCount: Number(row.rating_count) || 0,
    userRating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Obtener el Top 6 de plantillas mejor valoradas por la comunidad
 */
export async function fetchTopCommunityTemplates(
  limit: number = 6,
  currentUserId?: string | null
): Promise<CommunityTemplateRecord[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('community_templates')
      .select('*')
      .order('avg_rating', { ascending: false })
      .order('rating_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[CommunityTemplates] Error al obtener top plantillas:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    let userRatingsMap: Record<string, number> = {};
    if (currentUserId) {
      const ids = data.map((t) => t.id);
      const { data: ratingsData } = await supabase
        .from('template_ratings')
        .select('template_id, rating')
        .eq('user_id', currentUserId)
        .in('template_id', ids);

      if (ratingsData) {
        userRatingsMap = ratingsData.reduce((acc, curr) => {
          acc[curr.template_id] = curr.rating;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    return data.map((row) => mapRowToTemplate(row, userRatingsMap[row.id] ?? null));
  } catch (err) {
    console.warn('[CommunityTemplates] Excepción al obtener top plantillas:', err);
    return [];
  }
}

/**
 * Buscar y filtrar plantillas de la comunidad en tiempo real
 */
export async function searchCommunityTemplates(
  options: SearchCommunityTemplatesOptions = {}
): Promise<CommunityTemplateRecord[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  const { query, category, sortBy = 'top_rated', limit = 50, userId } = options;

  try {
    let builder = supabase.from('community_templates').select('*');

    if (category && category !== 'Todas') {
      builder = builder.or(`category.eq."${category}",technical_profile.ilike."%${category}%"`);
    }

    if (query && query.trim()) {
      const clean = query.trim().replace(/"/g, '');
      builder = builder.or(
        `title.ilike."%${clean}%",description.ilike."%${clean}%",technical_profile.ilike."%${clean}%",author_name.ilike."%${clean}%"`
      );
    }

    if (sortBy === 'top_rated') {
      builder = builder.order('avg_rating', { ascending: false }).order('rating_count', { ascending: false });
    } else if (sortBy === 'popular') {
      builder = builder.order('rating_count', { ascending: false }).order('avg_rating', { ascending: false });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }

    builder = builder.limit(limit);

    const { data, error } = await builder;

    if (error) {
      console.warn('[CommunityTemplates] Error en búsqueda de plantillas:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    let userRatingsMap: Record<string, number> = {};
    if (userId) {
      const ids = data.map((t) => t.id);
      const { data: ratingsData } = await supabase
        .from('template_ratings')
        .select('template_id, rating')
        .eq('user_id', userId)
        .in('template_id', ids);

      if (ratingsData) {
        userRatingsMap = ratingsData.reduce((acc, curr) => {
          acc[curr.template_id] = curr.rating;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    return data.map((row) => mapRowToTemplate(row, userRatingsMap[row.id] ?? null));
  } catch (err) {
    console.warn('[CommunityTemplates] Excepción en búsqueda de plantillas:', err);
    return [];
  }
}

/**
 * Publicar un trabajo redactado en la comunidad pública de Supabase
 */
export async function publishWorkAsCommunityTemplate(
  params: PublishTemplateParams
): Promise<CommunityTemplateRecord> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase no está configurado o no hay conexión con el servidor.');
  }

  const templateId = `tpl_comm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const payload = {
    id: templateId,
    author_id: params.authorId,
    author_name: params.authorName,
    author_username: params.authorUsername || null,
    title: params.title.trim() || 'Plantilla de la Comunidad',
    category: params.category.trim() || 'General',
    technical_profile: params.technicalProfile.trim() || 'General',
    description: params.description.trim(),
    target_words: params.targetWords || 0,
    paper_size: params.paperSize || 'letter',
    content_html: params.contentHtml,
    content_text: params.contentText || '',
    tags: params.tags || [],
    avg_rating: 0.0,
    rating_count: 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('community_templates')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudo publicar la plantilla en la comunidad.');
  }

  return mapRowToTemplate(data);
}

/**
 * Calificar una plantilla comunitaria (1 a 5 estrellas)
 */
export async function rateCommunityTemplate(
  templateId: string,
  userId: string,
  rating: number
): Promise<{ avgRating: number; ratingCount: number; userRating: number }> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase no está configurado.');
  }

  const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));

  // Upsert en template_ratings
  const { error: ratingError } = await supabase
    .from('template_ratings')
    .upsert(
      {
        template_id: templateId,
        user_id: userId,
        rating: cleanRating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_id,user_id' }
    );

  if (ratingError) {
    throw new Error(ratingError.message || 'No se pudo registrar la calificación.');
  }

  // Obtener estadísticas actualizadas de la plantilla
  const { data: tplData, error: fetchError } = await supabase
    .from('community_templates')
    .select('avg_rating, rating_count')
    .eq('id', templateId)
    .single();

  if (fetchError || !tplData) {
    return { avgRating: cleanRating, ratingCount: 1, userRating: cleanRating };
  }

  return {
    avgRating: Number(tplData.avg_rating) || cleanRating,
    ratingCount: Number(tplData.rating_count) || 1,
    userRating: cleanRating,
  };
}

/**
 * Eliminar una plantilla publicada por el propio autor
 */
export async function deleteCommunityTemplate(
  templateId: string,
  authorId: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase no está configurado.');
  }

  const { error } = await supabase
    .from('community_templates')
    .delete()
    .eq('id', templateId)
    .eq('author_id', authorId);

  if (error) {
    throw new Error(error.message || 'No se pudo eliminar la plantilla.');
  }
}

