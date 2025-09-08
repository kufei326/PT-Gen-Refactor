import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-node-polyfills';

export default {
  input: 'index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [
    nodePolyfills(),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ],
  external: ['__STATIC_CONTENT_MANIFEST']
};