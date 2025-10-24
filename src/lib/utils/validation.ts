/**
 * Validation utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'A senha deve ter no mínimo 6 caracteres' };
  }
  return { valid: true };
}

/**
 * Check if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Validate birth date
 * - Must be a valid date
 * - User must be at least 13 years old
 * - User must be less than 120 years old
 */
export function isValidBirthDate(dateString: string): { valid: boolean; error?: string } {
  if (!dateString) {
    return { valid: false, error: 'Data de nascimento é obrigatória' };
  }

  const date = new Date(dateString);
  const now = new Date();

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Data inválida' };
  }

  // Check if date is in the future
  if (date > now) {
    return { valid: false, error: 'Data de nascimento não pode ser no futuro' };
  }

  // Calculate age
  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();

  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  // Check minimum age (13 years)
  if (actualAge < 13) {
    return { valid: false, error: 'Você deve ter no mínimo 13 anos' };
  }

  // Check maximum age (120 years)
  if (actualAge > 120) {
    return { valid: false, error: 'Data de nascimento inválida' };
  }

  return { valid: true };
}

/**
 * Validate full name
 */
export function isValidFullName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'O nome completo deve ter no mínimo 2 caracteres' };
  }

  // Check if has at least first and last name
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return { valid: false, error: 'Por favor, informe nome e sobrenome' };
  }

  return { valid: true };
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
