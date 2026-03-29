/**
 * lib/edu-domains.ts
 *
 * Validates whether an email domain belongs to an educational institution.
 * Handles US `.edu` as well as international variations like `.ac.uk`, `.edu.np`, etc.
 */

const EDU_PATTERNS = [
  /\.edu$/i,          // USA (harvard.edu, mit.edu)
  /\.ac\.uk$/i,       // UK (ox.ac.uk, cam.ac.uk)
  /\.ac\.in$/i,       // India (iitb.ac.in)
  /\.edu\.au$/i,      // Australia (unimelb.edu.au)
  /\.edu\.pk$/i,      // Pakistan
  /\.edu\.np$/i,      // Nepal
  /\.edu\.br$/i,      // Brazil
  /\.edu\.cn$/i,      // China
  /\.edu\.sg$/i,      // Singapore
  /\.ac\.nz$/i,       // New Zealand
  /\.ac\.za$/i,       // South Africa
];

export function isStudentEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  
  const domain = email.split("@")[1]?.trim();
  if (!domain) return false;

  return EDU_PATTERNS.some((pattern) => pattern.test(domain));
}
