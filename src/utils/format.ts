/**
 * Mobile number formatting rules:
 * 1. Only digits allowed
 * 2. If first digit is '0', it is removed
 * 3. Maximum 10 digits
 */
export const formatMobileNumber = (value: string): string => {
  let cleaned = value.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  return cleaned.substring(0, 10)
}

/**
 * Validation regex for 10-digit mobile number
 */
export const MOBILE_REGEX = /^[0-9]{10}$/
