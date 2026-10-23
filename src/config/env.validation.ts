export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET'];

  for (const key of required) {
    const value = config[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
  }

  const jwtSecret = String(config.JWT_SECRET);
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET deve ter pelo menos 16 caracteres.');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
  }

  const bcryptRounds = Number(config.BCRYPT_ROUNDS ?? 10);
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 4 || bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS deve ser um inteiro entre 4 e 15.');
  }

  return config;
}
