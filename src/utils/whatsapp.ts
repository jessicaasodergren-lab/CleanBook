// src/utils/whatsapp.ts
import type { Booking, Property } from '../lib/supabase';
import { formatDate, APP_CONFIG } from '../lib/constants';
import { getValidNote } from './notes';

export function getBookingWhatsAppUrl(booking: Booking, phone: string = APP_CONFIG.mariaPhoneNumber || '34600000000'): string {
  const depDate = formatDate(booking.check_out_date, 'es');
  const depTime = booking.check_out_exact_time ? `kl ${booking.check_out_exact_time}` : '';
  const arrDate = formatDate(booking.check_in_date, 'es');
  const arrTime = booking.check_in_exact_time ? `kl ${booking.check_in_exact_time}` : '';
  
  const notesText = getValidNote(booking.notes_es, booking.notes);

  const msg = 
`¡Hola Maria! 🧹
Nueva reserva para gestionar en CleanBook:

📍 *Propiedad:* ${booking.property_name} (${booking.property_address || booking.property_name})
📅 *Salida (Limpieza):* ${depDate} ${depTime}
📅 *Entrada del huésped:* ${arrDate} ${arrTime}
👥 *Huéspedes:* ${booking.guests}
🧺 *Lavar:* ${booking.laundry ? 'SÍ' : 'NO'}
${notesText ? `📝 *Instrucciones:* ${notesText}\n` : ''}
Por favor, entra en CleanBook para aceptar la tarea.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function getPropertyInviteWhatsAppUrl(prop: Property): string {
  const code = prop.invite_code || '';
  const msg = `¡Hola! Te invito a conectarte a mi propiedad "${prop.name}" en CleanBook.\n\nCódigo de invitación: *${code}*`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}