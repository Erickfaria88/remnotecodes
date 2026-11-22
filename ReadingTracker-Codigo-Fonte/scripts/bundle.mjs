import { cp } from 'node:fs/promises';
import { build, context } from 'esbuild';

const dev = process.argv.includes('--dev');
const port = Number(process.env.READING_TRACKER_PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
const options = {
  entryPoints: {
    'today-plan-sandbox': 'src/widgets/today-plan.tsx',
    'index-sandbox': 'src/widgets/index.tsx',
    'reading-tracker-sandbox': 'src/widgets/reading-tracker.tsx',
    'reading-dashboard-sandbox': 'src/widgets/reading-dashboard.tsx',
    'document-progress-sandbox': 'src/widgets/document-progress.tsx',
    'lesson-progress-sandbox': 'src/widgets/lesson-progress.tsx',
  },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  define: { 'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production') },
  minify: !dev,
  sourcemap: dev,
};

const nativeOptions = {
  ...options,
  entryPoints: {
    'today-plan': 'src/widgets/today-plan.tsx',
    index: 'src/widgets/index.tsx',
    'reading-tracker': 'src/widgets/reading-tracker.tsx',
    'reading-dashboard': 'src/widgets/reading-dashboard.tsx',
    'document-progress': 'src/widgets/document-progress.tsx',
    'lesson-progress': 'src/widgets/lesson-progress.tsx',
  },
  banner: { js: 'const IMPORT_META = import.meta;' },
};
await cp('public', 'dist', { recursive: true });
if (dev) {
  const server = await context(options);
  const native = await context(nativeOptions);
  try {
    await Promise.all([server.watch(), native.watch()]);
    await server.serve({
      host: '127.0.0.1',
      port,
      servedir: 'dist',
      cors: { origin: '*' },
    });
    console.log('Reading Tracker disponível em http://localhost:' + port);
  } catch (error) {
    await Promise.all([server.dispose(), native.dispose()]);
    throw error;
  }
} else {
  await Promise.all([build(options), build(nativeOptions)]);
}

