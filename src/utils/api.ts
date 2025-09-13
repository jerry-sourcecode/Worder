import TypeJson from './TypeJson';

interface Program {
    /**
     * 获取当前环境
     * @returns release表示打包后，debug表示开发环境
     */
    ENVMODE: () => 'release' | 'debug';
    /**
     * 获取项目根目录
     * @returns 项目根目录
     */
    ProjectRoot: () => string;
}

interface fs {
    /**
     * 获取本地数据
     * @param key 数据的键
     */
    get(key?: string): string;
    /**
     * 储存数据
     * @param key 数据的键
     * @param value 数据的值
     */
    set(key: string, value: string): void;
    clear(): void;
}

declare global {
    interface Window {
        Program: Program;
        fs: fs;
    }
}

const API = {
    getData(key?: string): string | null {
        if (!key) throw 'GET: Key is Empty!';
        return localStorage.getItem(key);
    },

    setData(key: string, value: string | Object): void {
        if (typeof value === 'object') value = TypeJson.stringify(value);
        return localStorage.setItem(key, value as string);
    },
    clearData(): void {
        return localStorage.clear();
    },
};

export default API;
