import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'caduceus',
      fileName: (format) => `caduceus.${format}.js`,
    },
    rollupOptions: {
      // createEndpoints sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['buffer'],
      output: {
        exports: 'named',
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          buffer: 'buffer',
        },
      },
    },
  },
  test: {
    watch: false,
  }
});
