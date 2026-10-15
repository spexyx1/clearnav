import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const VENDOR_CHUNKS: Array<[string, RegExp]> = [
  ['vendor-react', /\/node_modules\/(react|react-dom|scheduler)\//],
  ['vendor-supabase', /\/node_modules\/@supabase\//],
  ['vendor-tiptap', /\/node_modules\/(@tiptap|prosemirror-[^/]+|linkifyjs|orderedmap|rope-sequence|w3c-keyname)\//],
  ['vendor-dnd', /\/node_modules\/@dnd-kit\//],
  ['vendor-i18n', /\/node_modules\/(i18next|react-i18next)\//],
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const match = VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id));
          return match?.[0];
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
