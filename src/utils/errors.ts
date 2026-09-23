export function translateDbError(error: any): string {
  // If no error, just return a generic system error
  if (!error) return "We encountered a system error. Please wait a moment and try again, or contact the Admin if the issue persists.";

  const errMessage = (error.message || error.details || String(error)).toLowerCase();
  const errCode = error.code ? String(error.code).toLowerCase() : '';

  // 1. User Fixable (Data Mismatch)
  // Postgres 22P02 is invalid text representation (e.g. text in number field)
  // 23502 is not null violation
  // 23514 is check constraint violation
  if (
    errCode === '22p02' || 
    errCode === '23502' || 
    errCode === '23514' ||
    errMessage.includes('invalid input') ||
    errMessage.includes('null value in column') ||
    errMessage.includes('violates check constraint') ||
    errMessage.includes('invalid format') ||
    errMessage.includes('not a number')
  ) {
    return "Please ensure all amounts are valid numbers. Leave optional fields blank instead of adding text.";
  }

  // 2. Not Allowed (RLS/Permissions)
  // Postgres 42501 is insufficient privilege
  if (
    errCode === '42501' || 
    errMessage.includes('policy') ||
    errMessage.includes('permission denied') ||
    errMessage.includes('unauthorized') ||
    errMessage.includes('row level security')
  ) {
    return "You do not have authorization to perform this action. Please consult the Admin.";
  }

  // 3. Coming Soon (Not Implemented)
  // E.g., if a route or RPC is missing
  if (
    errCode === '42883' || // undefined_function
    errMessage.includes('not implemented') ||
    errMessage.includes('coming soon')
  ) {
    return "This feature is currently under development and coming soon.";
  }

  // 4. System Fault (Timeout/500/Connection Issues)
  // Anything else falls back to a generic friendly error, ensuring no DB details are exposed.
  return "We encountered a system error. Please wait a moment and try again, or contact the Admin if the issue persists.";
}
