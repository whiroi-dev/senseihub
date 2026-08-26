import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isServerRunning, API_BASE_URL } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('======================================================');
  console.log('🥋 GERADOR DE CERTIFICADO — E2E & API TEST SUITE');
  console.log('======================================================');
  console.log(`Target API URL: ${API_BASE_URL}`);

  const serverOnline = await isServerRunning();
  if (!serverOnline) {
    console.warn(`\n⚠️  WARNING: Backend server is not currently reachable at ${API_BASE_URL}.`);
    console.warn(`Ensure the backend server is running (e.g. 'npm run dev' or Docker compose) before running live network tests.\n`);
  } else {
    console.log('✅ Backend server is ONLINE and responding to /health.\n');
  }

  const testFiles = [
    path.resolve(__dirname, 'auth.test.ts'),
    path.resolve(__dirname, 'stats.test.ts'),
    path.resolve(__dirname, 'email.test.ts'),
    path.resolve(__dirname, 'logo.test.ts'),
    path.resolve(__dirname, 'e2e_lifecycle.test.ts'),
    path.resolve(__dirname, 'final_challenge.test.ts'),
  ];

  console.log(`Running ${testFiles.length} test suites...\n`);

  const testStream = run({
    files: testFiles,
    concurrency: 1, // Sequential execution for lifecycle stability
  });

  testStream.compose(new spec()).pipe(process.stdout);

  testStream.on('test:fail', () => {
    process.exitCode = 1;
  });
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
