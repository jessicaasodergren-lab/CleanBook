// src/services/bookingService.ts
import { supabase, type Booking, translateToSpanish } from '../lib/supabase';

export const bookingService = {
  /**
   * Skapar en ny gästbokning
   */
  async createBooking(payload: Omit<Booking, 'id' | 'created_at' | 'status' | 'properties'>): Promise<Booking> {
    let notesEs: string | null = null;
    const cleanNotes = payload.notes?.trim();

    if (cleanNotes) {
      try {
        const safeText = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
        const translated = await translateToSpanish(safeText);
        notesEs = (translated && !translated.toUpperCase().includes('QUERY LENGTH LIMIT')) ? translated : cleanNotes;
      } catch {
        notesEs = cleanNotes;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...payload,
        notes: cleanNotes || null,
        notes_es: notesEs,
        status: 'pending',
      })
      .select('*, properties(name, address)')
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Städerska accepterar, återöppnar eller slutför en bokning (valideras i databasen)
   */
  async updateStatus(bookingId: string, status: 'accepted' | 'finished'): Promise<void> {
    const { error } = await supabase.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_status: status,
    });

    if (error) throw error;
  },

  async deleteBooking(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
  },
};
