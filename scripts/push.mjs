import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  execSync('npx drizzle-kit push --config ./drizzle.config.cjs', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../lib/db')
  });
} catch (err) {
  process.exit(1);
}
