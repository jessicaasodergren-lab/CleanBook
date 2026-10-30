// src/services/bookingService.ts
import { supabase, type Booking, type BookingStatus, translateToSpanish } from '../lib/supabase';

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
   * Uppdaterar en hel bokning
   */
  async updateBooking(
    bookingId: string,
    payload: Partial<Omit<Booking, 'id' | 'created_at'>>
  ): Promise<Booking> {
    let notesEs = payload.notes_es;

    if (payload.notes !== undefined) {
      const cleanNotes = payload.notes?.trim();
      if (cleanNotes) {
        try {
          const safeText = cleanNotes.length > 450 ? cleanNotes.slice(0, 450) : cleanNotes;
          const translated = await translateToSpanish(safeText);
          notesEs = (translated && !translated.toUpperCase().includes('QUERY LENGTH LIMIT')) ? translated : cleanNotes;
        } catch {
          notesEs = cleanNotes;
        }
      } else {
        notesEs = null;
      }
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        ...payload,
        ...(payload.notes !== undefined ? { notes_es: notesEs } : {}),
      })
      .eq('id', bookingId)
      .select('*, properties(name, address)')
      .single();

    if (error) throw error;
    return data as Booking;
  },

  async updateStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

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