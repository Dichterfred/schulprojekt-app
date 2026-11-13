export function startOfDayUTC(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

export function endOfDayUTC(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999Z`;
}

export function toDateOnly(isoString: string): string {
  return new Date(isoString).toISOString().slice(0, 10);
}

export function toLocalDateTimeInputValue(isoString: string): string {
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/** Reine Datumswerte liegen als UTC-Tagesgrenzen vor (siehe startOfDayUTC/endOfDayUTC) – daher in UTC formatieren. */
export function formatDateOnly(isoString: string): string {
  return new Date(isoString).toLocaleDateString("de-DE", { timeZone: "UTC" });
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("de-DE");
}
