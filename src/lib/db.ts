import type { Visit, TransportType } from '../types';
import { supabase } from './supabase';

export async function uploadPhoto(base64: string, userId: string, spotId: string): Promise<string | null> {
  const base64Data = base64.split(',')[1];
  const mime = base64.split(';')[0].split(':')[1] ?? 'image/jpeg';
  const ext = mime.split('/')[1] ?? 'jpg';
  const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const path = `${userId}/${spotId}.${ext}`;
  const { error } = await supabase.storage.from('visit-photos').upload(path, blob, { upsert: true, contentType: mime });
  if (error) return null;
  const { data } = supabase.storage.from('visit-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertVisit(visit: Visit, userId: string): Promise<void> {
  await supabase.from('visits').upsert({
    user_id: userId,
    spot_id: visit.spotId,
    visited_at: visit.visitDate,
    points: visit.points,
    transport: visit.transportType,
    memo: visit.comment,
    missions: visit.missionsCompleted,
    photo_url: visit.photoUrl ?? null,
  }, { onConflict: 'user_id,spot_id' });
}

export async function fetchVisits(userId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .eq('user_id', userId)
    .order('visited_at', { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id as string,
    spotId: row.spot_id as string,
    visitDate: row.visited_at as string,
    transportType: (row.transport ?? 'car') as TransportType,
    missionsCompleted: Array.isArray(row.missions) ? (row.missions as boolean[]) : [],
    comment: (row.memo ?? '') as string,
    points: (row.points ?? 0) as number,
    photoUrl: (row.photo_url ?? undefined) as string | undefined,
  }));
}

export async function deleteVisit(id: string): Promise<void> {
  await supabase.from('visits').delete().eq('id', id);
}

export async function updateVisitMemo(id: string, memo: string): Promise<void> {
  await supabase.from('visits').update({ memo }).eq('id', id);
}
