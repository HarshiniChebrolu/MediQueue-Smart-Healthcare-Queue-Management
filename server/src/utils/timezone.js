/**
 * Timezone Utility for MediQueue Hospital
 * Configurable hospital local timezone (default: Asia/Kolkata).
 * Ensures daily queue counters and dates reset at local midnight.
 */

export const getHospitalTimeZone = () => {
  return process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata';
};

/**
 * Returns formatted YYYY-MM-DD string in hospital local timezone
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-09-30"
 */
export const getHospitalDateString = (date = new Date()) => {
  const d = new Date(date);
  const timeZone = getHospitalTimeZone();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch (error) {
    // Fallback if timezone string is invalid
    console.error(`[Timezone] Error formatting date for ${timeZone}:`, error.message);
    return d.toISOString().split('T')[0];
  }
};

/**
 * Returns current timestamp in ISO format
 */
export const getHospitalNow = () => {
  return new Date();
};
