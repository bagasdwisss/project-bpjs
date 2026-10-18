// src/utils/pdpMasking.js - UU PDP No. 27/2022 Data Masking for Frontend Displays

export const maskNIK = (nik) => {
  if (!nik || typeof nik !== 'string') return '-';
  const clean = nik.trim();
  if (clean.length < 10) return clean;
  const prefix = clean.substring(0, 6);
  const suffix = clean.substring(clean.length - 4);
  const stars = '*'.repeat(Math.max(4, clean.length - 10));
  return `${prefix}${stars}${suffix}`;
};

export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '-';
  const clean = phone.trim();
  if (clean.length < 7) return clean;
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 3);
  return `${prefix}****${suffix}`;
};

export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '-';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};
