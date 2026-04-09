/**
 * Load growe-backend/.env regardless of process.cwd() (must be imported before other app code).
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __root = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__root, '../.env') });
