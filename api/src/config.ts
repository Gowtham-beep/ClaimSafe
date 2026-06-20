import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'PDF_SERVICE_URL',
];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar] === undefined) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}



export const config = {
  databaseUrl: process.env.DATABASE_URL as string,
  redisUrl: process.env.REDIS_URL as string,

  groqApiKey: process.env.GROQ_API_KEY as string,
  geminiApiKey: process.env.GEMINI_API_KEY as string,
  pdfServiceUrl: process.env.PDF_SERVICE_URL as string,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  sessionSecret: process.env.SESSION_SECRET || 'changeme',
  pdfTtlHours: parseInt(process.env.PDF_TTL_HOURS || '48', 10),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '8', 10),
} as const;

export type Config = typeof config;

