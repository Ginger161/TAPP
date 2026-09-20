/**
 * Standardize date and time formatting across the TAPP application.
 * All user-facing dates should strictly be in DD/MM/YYYY format.
 */

/**
 * Formats a given date string or Date object into strict DD/MM/YYYY
 */
export function formatDateToDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats a given date string or Date object into strict DD/MM/YYYY HH:mm A
 * Example: 20/09/2026 02:30 PM
 */
export function formatDateTimeToDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const strHour = String(hours).padStart(2, '0');

  return `${day}/${month}/${year} ${strHour}:${minutes} ${ampm}`;
}

/**
 * Parses an ISO string back to a local JS Date for DatePickers
 */
export function parseISOToDate(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Gets today's date formatted as a local ISO string (YYYY-MM-DD)
 */
export function getLocalWATDateString(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wat = new Date(utc + (3600000 * 1));
  return wat.toISOString().split('T')[0];
}
