export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'A senha deve ter no mínimo 6 caracteres' };
  }
  return { valid: true };
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

export function isValidBirthDate(dateString: string): { valid: boolean; error?: string } {
  if (!dateString) {
    return { valid: false, error: 'Data de nascimento é obrigatória' };
  }

  const date = new Date(dateString);
  const now = new Date();

  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Data inválida' };
  }

  if (date > now) {
    return { valid: false, error: 'Data de nascimento não pode ser no futuro' };
  }

  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  const dayDiff = now.getDate() - date.getDate();

  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  if (actualAge < 13) {
    return { valid: false, error: 'Você deve ter no mínimo 13 anos' };
  }

  if (actualAge > 120) {
    return { valid: false, error: 'Data de nascimento inválida' };
  }

  return { valid: true };
}

export function isValidFullName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'O nome completo deve ter no mínimo 2 caracteres' };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return { valid: false, error: 'Por favor, informe nome e sobrenome' };
  }

  return { valid: true };
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
