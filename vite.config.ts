import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// i18n libraries live with React: react-i18next needs React initialised first, and splitting them
// created a circular chunk import that crashed the app on startup.
const VENDOR_CHUNKS: Array<[string, RegExp]> = [
  ['vendor-react', /\/node_modules\/(react|react-dom|scheduler|i18next|react-i18next|void-elements|html-parse-stringify|use-sync-external-store)\//],
  ['vendor-supabase', /\/node_modules\/@supabase\//],
  ['vendor-tiptap', /\/node_modules\/(@tiptap|prosemirror-[^/]+|linkifyjs|orderedmap|rope-sequence|w3c-keyname)\//],
  ['vendor-dnd', /\/node_modules\/@dnd-kit\//],
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('commonjsHelpers')) return 'vendor-react';
          const match = VENDOR_CHUNKS.find(([, pattern]) => pattern.test(id));
          return match?.[0];
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
