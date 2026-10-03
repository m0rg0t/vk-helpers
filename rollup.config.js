import typescript from '@rollup/plugin-typescript';

// External Bridge shares the consumer instance; isolated entrypoints separate
// browser code from node:crypto while the legacy root surface remains available.
export default ['es', 'cjs'].map(format => ({
  input: { index: 'src/index.ts', browser: 'src/browser/index.ts', server: 'src/server.ts' },
  output: { dir: 'dist', entryFileNames: `[name].${format === 'es' ? 'js' : 'cjs'}`, chunkFileNames: `[name]-[hash].${format === 'es' ? 'js' : 'cjs'}`, format, exports: 'named', interop: 'auto' },
  external: ['node:crypto', 'crypto', '@vkontakte/vk-bridge'],
  plugins: [typescript({ tsconfig: './tsconfig.json', declaration: format === 'es', noEmitOnError: true })],
}));
