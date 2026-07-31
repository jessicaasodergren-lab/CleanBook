import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DepartureTimeWindow = 'morning' | 'afternoon' | 'evening';
export type ArrivalTimeWindow = 'morning' | 'afternoon' | 'evening';
export type BookingStatus = 'pending' | 'accepted' | 'finished';

export interface Property {
  id: string;
  name: string;
  address: string;
  passcode: string;
  host_name?: string | null;
  kvm?: string | null;
  rooms?: string | null;
  bathrooms?: string | null;
  cleaning_time?: string | null;
  property_notes?: string | null;
  created_at?: string;
}

export interface Booking {
  id: string;
  property_name: string;
  property_address: string | null;
  host_name: string | null;
  booking_title?: string;
  departure_date: string;
  departure_time_window: DepartureTimeWindow;
  departure_exact_time?: string | null;
  vacant_now?: boolean;
  no_next_guest: boolean;
  next_arrival_date: string | null;
  next_arrival_time_window: ArrivalTimeWindow | null;
  arrival_exact_time?: string | null;
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