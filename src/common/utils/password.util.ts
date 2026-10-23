import * as bcrypt from 'bcryptjs';

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE =
  'A senha deve ter entre 8 e 72 caracteres, com pelo menos uma letra e um número.';

export async function hashPassword(
  plainPassword: string,
  rounds: number,
): Promise<string> {
  return bcrypt.hash(plainPassword, rounds);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
