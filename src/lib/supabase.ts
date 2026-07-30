import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DepartureTimeWindow = 'morning' | 'afternoon' | 'evening';
export type ArrivalTimeWindow = 'morning' | 'afternoon' | 'evening';
export type BookingStatus = 'pending' | 'finished';

export interface Property {
  id: string;
  name: string;
  address: string;
  passcode: string;
  host_name?: string | null;
  created_at?: string;
}

export interface Booking {
  id: string;
  property_name: string;
  property_address: string | null;
  host_name: string | null;
  departure_date: string;
  departure_time_window: DepartureTimeWindow;
  vacant_now?: boolean; // Nytt fält: Bostaden står tom just nu
  no_next_guest: boolean;
  next_arrival_date: string | null;
  next_arrival_time_window: ArrivalTimeWindow | null;
  guests: number;
  laundry: boolean;
  notes: string | null;
  notes_es?: string | null;
  status: BookingStatus;
  created_at?: string;
}

export interface Incident {
  id: string;
  booking_id: string;
  note: string;
  photo_url: string | null;
  created_at?: string;
}

export type NewIncident = Omit<Incident, 'id' | 'created_at'>;

export async function translateToSpanish(text: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=sv|es`
    );
    const json = await res.json();
    return json.responseData?.translatedText || text;
  } catch {
    return text;
  }
}