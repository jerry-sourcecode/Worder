import { defineStore } from 'pinia';
import { Setting, Word, WordBook, WordMeaningSet } from './modal.ts';
import { computed, ref, type Ref, watch } from 'vue';
import API from '@/utils/api.ts';
import { TypeJson } from '@/utils/TypeJson.ts';
import { v7 as uuid } from 'uuid';

/**
 * Add Word Mode，添加单词模式
 */
const AWM = {
    /**
     * Append Mode，追加，当遇到单词时，保留原来的词义，添加多余的词义
     */
    append: 0,
    /**
     * Truncate Mode，覆盖，当遇到单词时，覆盖原来的词义
     */
    truct: 1,
} as const;
type AWM = (typeof AWM)[keyof typeof AWM];

export const useData = defineStore('data', () => {
    const words: Ref<WordBook[]> = ref([]);
    const POS: Ref<string[]> = ref([
        'unknown',
        'n',
        'v',
        'adj',
        'adv',
        'pron',
        'num',
        'art',
        'int',
        'prep',
        'conj',
        'aux',
    ]);
    const setting = ref(new Setting());
    /**
     * 计算当前选中的单词书。
     * 该计算属性会遍历所有单词书，找到与`nowWordBookName`匹配的单词书，并返回它。
     * 如果没有找到匹配项，则返回默认值（数组中的第一个元素或空对象）。
     *
     * @returns {Object} 返回当前选中的单词书对象。
     */
    const calCurWordBook = computed(() => {
        let x = -1;
        words.value.forEach((v, i) => {
            if (v.name == setting.value.nowWordBookName) x = i;
        });
        return words.value[x];
    });

    /**
     * 添加单词
     * @param word 单词文本
     * @param meanings 词义列表
     * @param also 同时写作什么
     * @param note 注释
     * @param mode 添加单词的模式
     */
    function addWord(
        word: string,
        meanings: WordMeaningSet[],
        also?: string[],
        note?: string,
        mode?: AWM
    ): void {
        const wd = new Word(uuid(), word, meanings, also, note);
        let hasChanged = false;
        calCurWordBook.value.words.forEach((v, id) => {
            if (v === null) return;
            if (v.text === word) {
                if (mode === AWM.truct) {
                    calCurWordBook.value.words[id]!.clearMeaning();
                    calCurWordBook.value.words[id]!.synForm = [];
                }
                wd.meaningSet.forEach((m) => {
                    calCurWordBook.value.words[id]!.addMeaning(m);
                });
                wd.synForm.forEach((f) => {
                    calCurWordBook.value.words[id]?.addSynForm(f.word);
                });
                calCurWordBook.value.words[id]!.note = wd.note;
                hasChanged = true;
                return;
            }
        });
        if (hasChanged) return;
        calCurWordBook.value.words.push(wd);
    }
    /**
     * 获取单词
     * @param text 单词文本
     */
    function getWordsByText(text: string): Word[] {
        let ans: Word[] = [];
        calCurWordBook.value.words.forEach((v, id) => {
            if (v?.text === text) ans.push(calCurWordBook.value.words[id]!);
        });
        return ans;
    }
    /**
     * 获取单词
     * @param uid 单词的id
     */
    function getWordsById(uid: string): Word | null {
        let ans: number = -1;
        calCurWordBook.value.words.forEach((v, id) => {
            if (v?.id === uid) ans = id;
        });
        if (ans === -1) return null;
        else return calCurWordBook.value.words[ans];
    }
    /**
     * 删除单词
     * @param id 单词的唯一标识
     */
    function rmWordsById(id: string): void {
        let rmPos: number = -1;
        calCurWordBook.value.words.forEach((v, idx) => {
            if (v?.id == id) rmPos = idx;
        });
        if (rmPos != -1) calCurWordBook.value.words.splice(rmPos, 1);
    }

    /**
     * 遍历所有单词
     * @param callback 回调函数
     */
    function forEach(callback: (value: Word, index: number) => void) {
        calCurWordBook.value.words.forEach((w, i) => {
            if (w === null) return;
            callback(w, i);
        });
    }
    /**
     * 获取所有可用单词，请不要使用id索引此列表。
     * @returns 可用单词列表
     */
    const availableWords = computed(() => {
        return calCurWordBook.value.words.filter((word) => word !== null);
    });

    API.setData('version', 'v1.0');

    watch(
        words,
        (n) => {
            API.setData('words', n);
        },
        { deep: true }
    );

    watch(
        POS,
        (n) => {
            API.setData('POS', n);
        },
        { deep: true }
    );

    watch(
        setting,
        (n) => {
            API.setData('setting', n);
        },
        { deep: true }
    );

    /**
     * 从本地加载数据
     */
    function init() {
        if (API.getData('words')) words.value = TypeJson.parse<WordBook[]>(API.getData('words')!);
        else words.value = [new WordBook('默认词书', [])];
        if (API.getData('POS')) POS.value = TypeJson.parse<string[]>(API.getData('POS')!);
        if (API.getData('setting'))
            setting.value = TypeJson.parse<Setting>(API.getData('setting')!);
    }

    function toJSON(): string {
        return JSON.stringify({
            words: TypeJson.stringify(words.value),
            POS: TypeJson.stringify(POS.value),
            setting: TypeJson.stringify(setting.value),
        });
    }

    function fromJSON(json: string): void {
        const { words: _words, POS: _POS, setting: _setting } = JSON.parse(json);
        words.value = TypeJson.parse<WordBook[]>(JSON.stringify(_words));
        POS.value = TypeJson.parse<string[]>(JSON.stringify(_POS));
        setting.value = TypeJson.parse<Setting>(JSON.stringify(_setting));
        location.reload();
    }

    return {
        addWord,
        getWordsById,
        getWordsByText,
        rmWordsById,
        forEach,
        init,
        availableWords,
        POS,
        AWM,
        setting,
        words,
        toJSON,
        fromJSON,
    };
});
