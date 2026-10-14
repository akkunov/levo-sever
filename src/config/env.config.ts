export type AppConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  directUrl: string;
  jwtSecret: string;
  jwtAccessTtl: string;
  corsOrigins: string[];
};

export function validateEnvironment(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const port = Number(process.env.PORT ?? 3001);
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
  const jwtSecret = process.env.JWT_SECRET;
  const jwtAccessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Set it in the environment before starting the application.',
    );
  }

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET is required. Set it in the environment before starting the application.',
    );
  }

  return {
    nodeEnv,
    port,
    databaseUrl,
    directUrl,
    jwtSecret,
    jwtAccessTtl,
    corsOrigins,
  };
}

export const appConfig = validateEnvironment();
