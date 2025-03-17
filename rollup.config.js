import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default [
  // ESM version
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
    },
    external: ['node:crypto', 'crypto'],
    plugins: [
      resolve(), 
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
      })
    ]
  },
  // CommonJS version
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named'
    },
    external: ['node:crypto', 'crypto'],
    plugins: [
      resolve(), 
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      })
    ]
  }
];
