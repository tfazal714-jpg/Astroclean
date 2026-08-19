// ---------------------------------------------------------------------------
// AI transform prompt presets.
//
// Each preset is a one-line instruction that works with the AI transform op.
// `needs` lists the input columns the prompt refers to; the preset is only
// shown when every column exists in the working table.
// ---------------------------------------------------------------------------

export const PROMPT_PRESETS = [
  {
    id: 'industry',
    label: 'Industry classifier',
    description: 'Return the industry sector for a company.',
    prompt:
      'Return the single industry sector for this company (e.g. Software, Healthcare, Manufacturing, Finance, Retail). One word or short phrase, nothing else.',
    output: 'industry',
    needs: ['company'],
  },
  {
    id: 'companyType',
    label: 'Company type',
    description: 'Classify a company as startup, smb, enterprise or agency.',
    prompt:
      'Classify this company as exactly one of: startup, smb, enterprise, agency, non-profit, or unknown. Reply with the single label only.',
    output: 'company_type',
    needs: ['company'],
  },
  {
    id: 'contactTitle',
    label: 'Normalize job title',
    description: 'Clean up a job title to a standard form.',
    prompt:
      'Normalize this job title: expand common abbreviations, fix casing, and strip extra words like "the" or department prefixes. Return the clean title only.',
    output: 'title_normalized',
    needs: ['job_title'],
  },
  {
    id: 'emailTone',
    label: 'Email tone / persona',
    description: 'Guess whether an address is a personal or role account.',
    prompt:
      'Classify this email address as exactly one of: personal, role (e.g. info@, sales@), or unknown. Reply with the single label only.',
    output: 'email_type',
    needs: ['email'],
  },
  {
    id: 'location',
    label: 'Location guess',
    description: 'Guess the country from a city or region name.',
    prompt:
      'If this value is a city or region, return the country it is most likely in. If it is already a country, return it unchanged. One word, nothing else. If unknown, return unknown.',
    output: 'country',
    needs: ['city'],
  },
  {
    id: 'seniority',
    label: 'Seniority level',
    description: 'Map a job title to a seniority band.',
    prompt:
      'Map this job title to exactly one seniority band: c-level, vp, director, manager, individual, intern, or unknown. Reply with the single label only.',
    output: 'seniority',
    needs: ['job_title'],
  },
  {
    id: 'summary',
    label: 'One-line company summary',
    description: 'Write a concise one-line description of a company.',
    prompt:
      'Write one concise sentence describing what this company most likely does, based on its name. No prefixes like "This company". Just the sentence.',
    output: 'company_summary',
    needs: ['company'],
  },
  {
    id: 'domainFromUrl',
    label: 'Extract domain from URL',
    description: 'Pull the bare domain out of a messy URL string.',
    prompt:
      'Extract the bare domain from this URL (no protocol, no www, no path). If it is not a URL, return the value unchanged. Reply with the domain only.',
    output: 'domain_clean',
    needs: ['website'],
  },
  {
    id: 'cleanText',
    label: 'Clean free text',
    description: 'Fix typos, casing and punctuation in a notes field.',
    prompt:
      'Clean this free-text note: fix obvious typos, normalize spacing and capitalization, and remove filler words. Keep the meaning. Return the cleaned text.',
    output: 'notes_clean',
    needs: ['notes'],
  },
  {
    id: 'csvNumber',
    label: 'Extract numeric value',
    description: 'Pull the first number out of a mixed string.',
    prompt:
      'Extract the first numeric value from this string (digits, optionally with decimal point). Return just the number, or empty if there is none.',
    output: 'value_extracted',
    needs: ['description'],
  },
  {
    id: 'sentiment',
    label: 'Sentiment label',
    description: 'Classify a review or note as positive / neutral / negative.',
    prompt:
      'Classify the sentiment of this text as exactly one of: positive, neutral, negative. Reply with the single label only.',
    output: 'sentiment',
    needs: ['review'],
  },
  {
    id: 'gender',
    label: 'Name gender guess',
    description: 'Guess the likely gender from a first name.',
    prompt:
      'Given this first name, guess the most likely gender: male, female, or unknown. Reply with the single label only.',
    output: 'gender_guess',
    needs: ['first_name'],
  },
]

/** Presets whose input columns all exist in the given column list. */
export function presetsForColumns(columnNames) {
  const cols = new Set(columnNames)
  return PROMPT_PRESETS.filter((p) => p.needs.every((c) => cols.has(c)))
}
