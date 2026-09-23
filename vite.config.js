import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{target:'es2022',rollupOptions:{input:{habits:'index.html',biblioteca:'biblioteca.html'}}}});
