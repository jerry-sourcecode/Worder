import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'  // 添加此行 simple表示简单模式
import vueDevTools from 'vite-plugin-vue-devtools'
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueDevTools(),
        electron({   //开始添加起
            main: {
                entry: 'electron/main.ts',
            },
            preload: {
                input: 'electron/preload.ts',
            },
        }),
    ],
    server: {
        port: 5173
    },
    base: "./",
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
})