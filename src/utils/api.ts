import TypeJson from './TypeJson';

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
