import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'id-validation' });

// Strict UUID validation schema - no coercion
const uuidSchema = z.string().uuid();

/**
 * Validates and returns a UUID string
 * Returns the input if valid, throws if invalid
 */
export function asUuid(value: string): string {
  try {
    return uuidSchema.parse(value);
  } catch (error) {
    logger.debug({ value, error: error }, 'Invalid UUID provided to asUuid');
    throw new Error(`Invalid UUID: ${value}`);
  }
}

/**
 * Ensures value is returned as a string
 * For fields that should remain as text/varchar
 */
export function asText(value: string): string {
  if (typeof value !== 'string') {
    logger.debug({ value, type: typeof value }, 'Non-string value provided to asText');
    throw new Error(`Expected string, got ${typeof value}`);
  }
  return value;
}

/**
 * Safely validates unknown input to string ID
 * Narrows unknown → string with validation
 */
export function validateId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    logger.debug({ value, type: typeof value }, 'Invalid ID provided to validateId');
    throw new Error('ID must be a non-empty string');
  }
  return value.trim();
}

/**
 * Result wrapper for service layer operations
 */
export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

/**
 * Creates a successful result
 */
export function success<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

/**
 * Creates an error result
 */
export function failure<T>(error: string): ServiceResult<T> {
  return { data: null, error };
}