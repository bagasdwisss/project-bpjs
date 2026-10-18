// server/utils/pdpMasking.js - PII Masking Compliant with UU Pelindungan Data Pribadi (UU PDP No. 27/2022)

/**
 * Masks 16-digit Indonesian NIK:
 * Example: 3201011234567890 -> 320101******7890
 */
export const maskNIK = (nik) => {
  if (!nik || typeof nik !== 'string') return nik;
  const clean = nik.trim();
  if (clean.length < 10) return '******';
  const prefix = clean.substring(0, 6);
  const suffix = clean.substring(clean.length - 4);
  const asterisks = '*'.repeat(Math.max(4, clean.length - 10));
  return `${prefix}${asterisks}${suffix}`;
};

/**
 * Masks Phone Number:
 * Example: 081234567890 -> 0812****7890
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  const clean = phone.trim();
  if (clean.length < 7) return '****';
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 3);
  return `${prefix}****${suffix}`;
};

/**
 * Masks Email Address:
 * Example: arthur.pendleton@bpjstk.go.id -> a***n@bpjstk.go.id
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `*@${domain}`;
  const prefix = local[0];
  const suffix = local[local.length - 1];
  return `${prefix}***${suffix}@${domain}`;
};

/**
 * Automatically masks sensitive PII fields in a record or array of records
 * unless the requester is an authorized Administrator.
 */
export const applyPdpMasking = (data, userRole) => {
  // Administrators with explicit need-to-know bypass masking
  if (userRole === 'Administrator' || userRole === 3) {
    return data;
  }

  const maskItem = (item) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    if (copy.nik) copy.nik = maskNIK(copy.nik);
    if (copy.no_telepon) copy.no_telepon = maskPhone(copy.no_telepon);
    if (copy.phone) copy.phone = maskPhone(copy.phone);
    if (copy.email) copy.email = maskEmail(copy.email);
    copy._pdp_masked = true;
    return copy;
  };

  if (Array.isArray(data)) {
    return data.map(maskItem);
  }
  return maskItem(data);
};
