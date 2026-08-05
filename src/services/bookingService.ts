// src/services/bookingService.ts
import { supabase, type Booking, type BookingStatus, translateToSpanish } from '../lib/supabase';

export const bookingService = {
  /**
   * Skapar en ny gästbokning med automatisk översättning av instruktioner till spanska
   */
  async createBooking(payload: Omit<Booking, 'id' | 'created_at' | 'status'>): Promise<Booking> {
    let notesEs: string | null = null;
    const cleanNotes = payload.notes?.trim();

    if (cleanNotes) {
      try {
        const safeText = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
        const translated = await translateToSpanish(safeText);
        
        if (
          translated &&
          !translated.toUpperCase().includes('QUERY LENGTH LIMIT') &&
          !translated.toUpperCase().includes('MYMEMORY')
        ) {
          notesEs = translated;
        } else {
          notesEs = cleanNotes;
        }
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
      .select()
      .single();

    if (error) throw error;
    return data as Booking;
  },

  /**
   * Uppdaterar bokningsstatus ('pending' | 'accepted' | 'finished')
   */
  async updateStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) throw error;
  },

  /**
   * Tar bort en bokning
   */
  async deleteBooking(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
  },
};