import pino from 'pino';

const pretty = (process.env.LOG_PRETTY ?? '1') === '1';
const level  = process.env.LOG_LEVEL ?? 'info';

export const logger = pino(
  pretty
    ? { level, transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } } }
    : { level }
);

export function shortRid() {
  // Small collision-safe-ish token for log lines
  return Math.random().toString(36).slice(2, 10);
}