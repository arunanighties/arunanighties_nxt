import { execSync } from 'child_process';

try {
  console.log('Pushing schema to database...');
  // Pass DATABASE_URL manually to ensure drizzle-kit picks it up if it doesn't support --env-file
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  console.log('Schema pushed successfully!');
} catch (error) {
  console.error('Failed to push schema.');
  process.exit(1);
}
