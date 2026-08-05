// src/i18n/translations.ts

export type Language = 'sv' | 'en' | 'da' | 'es';

export const translations = {
  common: {
    sv: { loading: 'Laddar...', error: 'Ett fel uppstod', save: 'Spara', cancel: 'Avbryt', delete: 'Ta bort' },
    en: { loading: 'Loading...', error: 'An error occurred', save: 'Save', cancel: 'Cancel', delete: 'Delete' },
    da: { loading: 'Indlæser...', error: 'Der opstod en fejl', save: 'Gem', cancel: 'Annuller', delete: 'Slet' },
    es: { loading: 'Cargando...', error: 'Ocurrió un error', save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar' },
  },

  auth: {
    // ... din befintliga auth-översättning ...
  },

  host: {
    // ... din befintliga host-översättning ...
  },

  cleaner: {
    // ... din befintliga cleaner-översättning ...
  },

  propertyList: {
    // ... din befintliga propertyList-översättning ...
  },

  // --- STÄDARS UPPDRAGSLISTA (TASKLIST) ---
  taskList: {
    es: {
      filterActive: '🧹 Activas',
      filterPending: '🟡 Por Aceptar',
      filterFinished: '💚 Completadas',
      statusPending: 'Por aceptar',
      statusAccepted: 'Aceptada',
      statusFinished: 'Completada',
      turnoverToday: '🔴 Cambio hoy mismo',
      turnoverTomorrow: '🟠 Entrada mañana',
      windowLabel: 'Ventana de Limpieza',
      turnoverSameDayShort: '⚡ Pocas horas',
      marginOneDayShort: '⏳ Margen 1 día',
      daysMargin: 'días de margen',
      departureLabel: '🚪 Salida de huésped',
      arrivalLabel: '🔑 Próxima entrada',
      noNextGuest: 'Sin próxima entrada',
      guests: 'huéspedes',
      laundryYes: '🧺 Lavar lencería',
      laundryNo: '🚫 Sin colada',
      btnAccept: 'Aceptar tarea',
      btnComplete: 'Completado',
      btnIncident: 'Incidencia / Daño',
      btnReopen: 'Reabrir tarea',
      instructionHost: 'Instrucción del anfitrión:',
      houseInfo: 'Información de la casa:',
      hostLabel: 'Anfitriona:',
      photosLabel: 'fotos',
      noTasksTitle: 'Sin tareas aquí',
      noTasksDesc: 'No hay limpiezas encontradas en este filtro.',
      errCannotCompleteEarly: 'No puedes completar esta tarea antes de la salida del huésped.',
    },
    en: {
      filterActive: '🧹 Active',
      filterPending: '🟡 To Accept',
      filterFinished: '💚 Completed',
      statusPending: 'To accept',
      statusAccepted: 'Accepted',
      statusFinished: 'Completed',
      turnoverToday: '🔴 Turnover today',
      turnoverTomorrow: '🟠 Arrival tomorrow',
      windowLabel: 'Cleaning Window',
      turnoverSameDayShort: '⚡ Same day',
      marginOneDayShort: '⏳ 1 day margin',
      daysMargin: 'days margin',
      departureLabel: '🚪 Guest departure',
      arrivalLabel: '🔑 Next arrival',
      noNextGuest: 'No upcoming guest',
      guests: 'guests',
      laundryYes: '🧺 Wash linen',
      laundryNo: '🚫 No laundry',
      btnAccept: 'Accept task',
      btnComplete: 'Completed',
      btnIncident: 'Incident / Damage',
      btnReopen: 'Reopen task',
      instructionHost: 'Host instruction:',
      houseInfo: 'House information:',
      hostLabel: 'Host:',
      photosLabel: 'photos',
      noTasksTitle: 'No tasks here',
      noTasksDesc: 'No cleanings found in this filter.',
      errCannotCompleteEarly: 'You cannot complete this task before guest check-out.',
    },
    sv: {
      filterActive: '🧹 Aktiva',
      filterPending: '🟡 Väntar på svar',
      filterFinished: '💚 Slutförda',
      statusPending: 'Väntar på svar',
      statusAccepted: 'Accepterad',
      statusFinished: 'Slutförd',
      turnoverToday: '🔴 Byte idag',
      turnoverTomorrow: '🟠 Ankomst imorgon',
      windowLabel: 'Städfönster',
      turnoverSameDayShort: '⚡ Byte samma dag',
      marginOneDayShort: '⏳ 1 dags marginal',
      daysMargin: 'dagars marginal',
      departureLabel: '🚪 Utcheckning gäst',
      arrivalLabel: '🔑 Nästa incheckning',
      noNextGuest: 'Ingen nästa incheckning',
      guests: 'gäster',
      laundryYes: '🧺 Tvätta lakan/handdukar',
      laundryNo: '🚫 Ingen tvätt',
      btnAccept: 'Acceptera uppdrag',
      btnComplete: 'Slutförd',
      btnIncident: 'Rapportera skada',
      btnReopen: 'Återöppna uppdrag',
      instructionHost: 'Värdens instruktion:',
      houseInfo: 'Husinformation:',
      hostLabel: 'Värd:',
      photosLabel: 'foton',
      noTasksTitle: 'Inga uppdrag här',
      noTasksDesc: 'Hittade inga städningar i det här filtret.',
      errCannotCompleteEarly: 'Du kan inte slutföra detta uppdrag före gästens utcheckning.',
    },
  },
};