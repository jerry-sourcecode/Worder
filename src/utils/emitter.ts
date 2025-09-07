// emitter.ts
import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

type signalType = {
    signal1: () => void;
    signal2: () => number;
    signal3: (param1: number, param2: string) => string;
};

export const useEmitter = defineStore('signals', () => {
    /**
     * 信号类型接口，定义所有可用信号及其参数和返回值
     */

    // 存储信号与回调函数的映射
    const signalMap: Ref<Map<string, [(...arg: any) => any]>> = ref(new Map());

    /**
     * 注册信号监听器
     * @param signalName - 要监听的信号名称
     * @param func - 信号触发时的回调函数
     */
    function on<T extends keyof signalType>(signalName: T, func: signalType[T]): void {
        if (!signalMap.value.has(signalName)) {
            signalMap.value.set(signalName, [func]);
        }
    }

    /**
     * 移除指定信号的所有监听器
     * @param signalName - 要移除的信号名称
     */
    function off(signalName: string) {
        signalMap.value.delete(signalName);
    }

    /**
     * 触发指定信号（只返回第一个有效结果）
     * @param signalName - 要触发的信号名称
     * @param param - 传递给监听器的参数
     * @returns 第一个有返回值的监听器的结果
     * @throws 如果没有注册的监听器则抛出错误
     * @warning 当多个监听器返回值时会打印警告
     */
    function emit<T extends keyof signalType>(
        signalName: T,
        ...param: Parameters<signalType[T]>
    ): ReturnType<signalType[T]> {
        let ansList = emitAll(signalName, ...param);
        if (ansList.length >= 2) {
            console.warn(
                `⚠️ 多个监听器返回了值，建议使用emitAll获取所有返回值。信号：${signalName}`
            );
        }
        return ansList[0];
    }

    /**
     * 触发指定信号并收集所有返回值
     * @param signalName - 要触发的信号名称
     * @param param - 传递给监听器的参数
     * @returns 所有监听器返回值的数组（过滤undefined）
     * @throws 如果没有注册的监听器则抛出错误
     */
    function emitAll<T extends keyof signalType>(
        signalName: T,
        ...param: Parameters<signalType[T]>
    ): ReturnType<signalType[T]>[] {
        let ansList: ReturnType<signalType[T]>[] = [];
        let hasRun = false;

        signalMap.value.get(signalName)?.forEach((v) => {
            hasRun = true;
            const returns = (v as unknown as Function)(...param);
            if (returns !== undefined) ansList.push(returns);
        });

        if (!hasRun) throw Error(`🚨 未找到信号处理器: ${signalName}`);
        return ansList;
    }

    return { on, off, emit, emitAll, signalMap };
});
