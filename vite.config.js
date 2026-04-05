import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(rootDir, 'index.html'),
                dicePrototype: resolve(rootDir, 'dice-prototype.html'),
                pyramidPlayfield: resolve(rootDir, 'pyramid-playfield.html')
            }
        }
    }
});
