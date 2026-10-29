import type { Booking } from './supabase';
import type { Language } from '../i18n/translations';

export const APP_CONFIG = {
  name: 'CleanBook',
  tagline: 'Smart Cleaning Management',
  fullTitle: 'CleanBook – Smart Cleaning Management',
  description: 'Hantering av städuppdrag och bokningar i semesterbostäder.',
  version: 'v0.9.0-beta.4', // <-- Här styr du appens aktuella version
  mariaPhoneNumber: '46721886174', // WhatsApp-format (utan + eller mellanslag)
};

export const TIME_WINDOWS = ['morning', 'afternoon', 'evening'] as const;

export const TIME_LABELS = {
  sv: {
    morning: 'Förmiddag (~10:00)',
    midday: 'Middag (~12:00)',
    afternoon: 'Eftermiddag (~14:00)',
    evening: 'Kväll (~18:00)',
    night: 'Natt',
  },
  es: {
    morning: 'Mañana (~10:00)',
    midday: 'Mediodía (~12:00)',
    afternoon: 'Tarde (~14:00)',
    evening: 'Noche (~18:00)',
    night: 'Noche',
  },
};

export const DATE_LOCALES: Record<Language, string> = {
  sv: 'sv-SE',
  en: 'en-GB',
  da: 'da-DK',
  es: 'es-ES',
};

export function formatDate(dateStr?: string | null, lang: Language = 'sv'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(DATE_LOCALES[lang], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateShort(dateStr?: string | null, lang: Language = 'sv'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(DATE_LOCALES[lang], {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(dateStr?: string | null, lang: Language = 'es'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString(DATE_LOCALES[lang], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getUrgency(booking: Booking) {
  if (booking.no_next_guest || !booking.next_arrival_date) {
    return {
      type: 'no_arrival' as const,
      title: '🟢 FLEXIBLE (SIN FECHA LÍMITE)',
      text: 'Sin próxima entrada definida. Puedes limpiar con calma a partir del inicio.',
    };
  }

  const arrKey = booking.next_arrival_time_window as keyof typeof TIME_LABELS.es | null;
  const arrTime = arrKey ? TIME_LABELS.es[arrKey] || 'Tarde' : null;

  if (booking.departure_date === booking.next_arrival_date) {
    return {
      type: 'same_day' as const,
      title: '⚡ ¡MISMO DÍA! STÄDFÖNSTER TRRECHO',
      text: arrTime
        ? `COMPLETAR ANTES DE: ${arrTime} de hoy`
        : `⚠️ ¡ENTRADA HOY! Completar lo antes posible.`,
    };
  }

  return {
    type: 'flexible' as const,
    title: '🟢 FLEXIBLE',
    text: `Completar antes del ${formatDateShort(booking.next_arrival_date, 'es')}${
      arrTime ? ` (${arrTime})` : ' (Hora no definida)'
    }`,
  };
}
