import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'artifacts/api-server');
const deploymentDir = path.resolve(rootDir, 'deployment');

async function deploy() {
  console.log('🚀 Starting deployment preparation...');

  // 1. Build the API server
  console.log('📦 Building API server...');
  execSync('pnpm run build', { cwd: apiDir, stdio: 'inherit' });

  // 2. Read package.json and prepare production version
  console.log('📝 Preparing production package.json...');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(apiDir, 'package.json'), 'utf-8'));
  
  const prodPkg = {
    name: 'aruna-api-prod',
    version: pkg.version || '1.0.0',
    type: 'module',
    main: 'index.mjs',
    scripts: {
      "build": "echo 'Pre-built — no build step needed'",
      "start": "node index.mjs"
    },
    dependencies: {}
  };

  const workspaceYaml = fs.readFileSync(path.resolve(rootDir, 'pnpm-workspace.yaml'), 'utf-8');
  const catalogMatch = workspaceYaml.match(/catalog:([\s\S]*?)(?=\n\n|\n[a-z])/);
  const catalog = {};
  if (catalogMatch) {
    catalogMatch[1].split('\n').forEach(line => {
      const match = line.match(/^\s+['"]?([^'":]+)['"]?:\s+['"]?([^'"]+)['"]?$/);
      if (match) catalog[match[1].trim()] = match[2].trim();
    });
  }

  // Copy all dependencies except workspace ones
  for (let [name, version] of Object.entries(pkg.dependencies || {})) {
    if (version.startsWith('workspace:')) continue;
    
    if (version === 'catalog:') {
      version = catalog[name] || version;
    }
    
    prodPkg.dependencies[name] = version;
  }

  fs.writeFileSync(
    path.resolve(deploymentDir, 'package.json'),
    JSON.stringify(prodPkg, null, 2)
  );

  // 3. Copy dist files
  console.log('🚚 Copying build artifacts...');
  const distDir = path.resolve(apiDir, 'dist');
  const files = fs.readdirSync(distDir);
  for (const file of files) {
    fs.copyFileSync(path.resolve(distDir, file), path.resolve(deploymentDir, file));
  }

  // 4. Create zip archive
  console.log('🤐 Creating deployment zip...');
  const zipPath = path.resolve(deploymentDir, 'api-deployment.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  
  // Use powershell to zip on windows
  execSync(`powershell -Command "Compress-Archive -Path ${deploymentDir}/* -DestinationPath ${zipPath} -Force"`, { stdio: 'inherit' });

  console.log('✅ Deployment package ready at: ' + zipPath);
}

deploy().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
