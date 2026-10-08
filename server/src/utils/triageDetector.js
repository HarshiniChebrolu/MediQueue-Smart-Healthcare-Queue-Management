/**
 * Safe Triage Assistant - Red Flag Keyword Screener
 * Scans reasonForVisit for critical warning signs.
 * IMPORTANT: Produces only an advisory flag for RECEPTIONIST review.
 * Never makes autonomous diagnosis or automatic queue re-ordering.
 */

const RED_FLAG_KEYWORDS = [
  'chest pain',
  'heart attack',
  'shortness of breath',
  'breathlessness',
  'difficulty breathing',
  'heavy bleeding',
  'severe bleeding',
  'loss of consciousness',
  'unconscious',
  'seizure',
  'convulsion',
  'stroke',
  'paralysis',
  'anaphylaxis',
  'severe allergic reaction',
  'poisoning',
  'choking',
  'severe burn',
  'head injury',
];

export const detectUrgentSymptoms = (text = '') => {
  if (!text || typeof text !== 'string') {
    return { isUrgentFlagged: false, flagReason: '' };
  }

  const normalized = text.toLowerCase();
  for (const keyword of RED_FLAG_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        isUrgentFlagged: true,
        flagReason: `POSSIBLE URGENT SYMPTOM DETECTED: "${keyword.toUpperCase()}" — RECEPTIONIST REVIEW REQUIRED.`,
      };
    }
  }

  return { isUrgentFlagged: false, flagReason: '' };
};

export const screenForTriageAdvisory = (text = '') => {
  if (!text || typeof text !== 'string') {
    return {
      isFlagged: false,
      advisoryLevel: 'NORMAL',
      keywords: [],
      disclaimer: 'NON-AUTONOMOUS DECISION SUPPORT: Requires manual clinical review by hospital staff.'
    };
  }

  const normalized = text.toLowerCase();
  const matchedKeywords = RED_FLAG_KEYWORDS.filter(kw => normalized.includes(kw));

  return {
    isFlagged: matchedKeywords.length > 0,
    advisoryLevel: matchedKeywords.length > 0 ? 'HIGH_PRIORITY_REVIEW' : 'NORMAL',
    keywords: matchedKeywords,
    disclaimer: 'NON-AUTONOMOUS DECISION SUPPORT: Requires manual clinical review by hospital staff. Does not constitute a medical diagnosis.'
  };
};

export default {
  detectUrgentSymptoms,
  screenForTriageAdvisory,
};
