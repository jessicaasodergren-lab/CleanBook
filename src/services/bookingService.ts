// src/services/bookingService.ts
import { supabase, type Booking, type BookingStatus, translateToSpanish } from '../lib/supabase';

export const bookingService = {
  /**
   * Hämtar alla bokningar för fastigheter som ägs av den inloggade värden
   */
  async getHostBookings(hostId: string): Promise<Booking[]> {
    // 1. Hämta värdens fastighets-ID:n
    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', hostId);

    if (propErr) throw propErr;
    if (!props || props.length === 0) return [];

    const propIds = props.map((p) => p.id);

    // 2. Hämta alla bokningar kopplade till dessa fastigheter
    const { data: bookings, error: bookErr } = await supabase
      .from('bookings')
      .select('*')
      .in('property_id', propIds)
      .order('check_in_date', { ascending: true });

    if (bookErr) throw bookErr;
    return (bookings as Booking[]) || [];
  },

  /**
   * Hämtar alla bokningar för fastigheter som städerskan är kopplad till
   */
  async getCleanerBookings(cleanerId: string): Promise<Booking[]> {
    // 1. Hämta alla fastigheter städerskan är ansluten till
    const { data: conns, error: connErr } = await supabase
      .from('property_connections')
      .select('property_id')
      .eq('cleaner_id', cleanerId);

    if (connErr) throw connErr;
    if (!conns || conns.length === 0) return [];

    const propIds = conns.map((c) => c.property_id);

    // 2. Hämta bokningar för dessa fastigheter
    const { data: bookings, error: bookErr } = await supabase
      .from('bookings')
      .select('*')
      .in('property_id', propIds)
      .order('check_in_date', { ascending: true });

    if (bookErr) throw bookErr;
    return (bookings as Booking[]) || [];
  },

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
   * Uppdaterar en hel bokning samt översätter instruktioner på nytt om de ändrats
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