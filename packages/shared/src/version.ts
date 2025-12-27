/**
 * @fileoverview Application version and migration information
 */

/** Current application version */
export const APP_VERSION = '1.0.0';

/** Schema version for database migrations */
export const SCHEMA_VERSION = 1;

/** Version information interface */
export interface VersionInfo {
  /** Application version */
  app: string;
  /** Database schema version */
  schema: number;
  /** Build timestamp */
  buildTime?: string;
  /** Git commit hash */
  gitCommit?: string;
}

/** Get current version info */
export function getVersionInfo(): VersionInfo {
  return {
    app: APP_VERSION,
    schema: SCHEMA_VERSION,
    buildTime: process.env.BUILD_TIME,
    gitCommit: process.env.GIT_COMMIT,
  };
}
