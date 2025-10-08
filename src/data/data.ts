import { defineStore } from 'pinia';
import { Setting, Word, WordBook, type WordMeaning, WordMeaningSet } from './modal.ts';
import { computed, ref, type Ref, watch } from 'vue';
import API from '@/utils/api.ts';
import { TypeJson } from '@/utils/TypeJson.ts';

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
    // 记录被删除单词的位置
    let nullList: number[] = [];
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
        })
        return words.value[x];
    })

    /**
     * 创建一个新的词书。
     * @param {string} bookId - 词书的唯一标识符。
     */
    function createWordBook(bookId: string)
    {
        words.value.push(new WordBook(bookId, []));
    }
    /**
     * 添加单词
     * @param word 单词文本
     * @param meanings 词义列表
     * @param also 同时写作什么
     * @param note 注释
     * @param mode 添加单词的模式
     */
    function addWord(word: string, meanings: WordMeaningSet[], also?: string[], note?: string, mode?: AWM): void;
    function addWord(word: string, meanings: WordMeaning[][], also?: string[], note?: string, mode?: AWM): void;
    function addWord(
        word: string,
        meanings: (WordMeaningSet | WordMeaning[])[],
        also: string[] = [],
        note: string = "",
        mode: AWM = AWM.append
    ): void {
        const wd = new Word(calCurWordBook.value.words.length, word, meanings, also, note);
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
                })
                calCurWordBook.value.words[id]!.note = wd.note;
                hasChanged = true;
                return;
            }
        });
        if (hasChanged) return;
        if (nullList.length == 0) {
            calCurWordBook.value.words.push(wd);
        } else {
            calCurWordBook.value.words[nullList[0]] = new Word(nullList[0], word, meanings, also, note);
            nullList.shift();
        }
    }
    /**
     * 获取单词
     * @param word 单词对象
     */
    function getWords(word: Word): Word | null;
    /**
     * 获取单词
     * @param text 单词文本
     */
    function getWords(text: string): Word[];
    /**
     * 获取单词
     * @param id 单词的唯一标识
     */
    function getWords(id: number): Word | null;
    function getWords(param: Word | string | number): Word[] | Word | null {
        const ans: Word[] = [];
        if (typeof param === 'string') {
            calCurWordBook.value.words.forEach((w) => {
                if (w === null) return;
                if (w.text === param) {
                    ans.push(w);
                }
            });
        } else if (typeof param === 'number') {
            return calCurWordBook.value.words[param];
        } else {
            return getWords(param.id);
        }
        return ans;
    }
    /**
     * 删除单词
     * @param word 单词对象
     */
    function rmWords(word: Word): void;
    /**
     * 删除单词
     * @param text 单词文本
     */
    function rmWords(text: string): void;
    /**
     * 删除单词
     * @param id 单词的唯一标识
     */
    function rmWords(id: number): void;
    function rmWords(param: Word | string | number): void {
        let rmpos = [];
        if (typeof param === 'string') {
            calCurWordBook.value.words.forEach((w, i) => {
                if (w === null) return;
                if (w.text === param) {
                    rmpos.push(i);
                }
            });
        } else if (typeof param === 'number') {
            if (calCurWordBook.value.words[param] === null) return;
            rmpos.push(param);
        } else {
            calCurWordBook.value.words.forEach((w, i) => {
                if (w === null) return;
                if (w.text === param.text) {
                    rmpos.push(i);
                }
            });
        }
        rmpos.forEach((i) => {
            calCurWordBook.value.words[i] = null;
            nullList.push(i);
        });
    }

    /**
     * 遍历所有单词
     * @param callbackfn 回调函数
     */
    function forEach(callbackfn: (value: Word, index: number) => void) {
        calCurWordBook.value.words.forEach((w, i) => {
            if (w === null) return;
            callbackfn(w, i);
        });
    }
    /**
     * 获取所有可用单词，请不要使用id索引此列表。
     * @returns 可用单词列表
     */
    const availableWords = computed(() => {
        return calCurWordBook.value.words.filter((word) => word !== null);
    });

    watch(
        words,
        (n) => {
            API.setData('words', n);
            API.setData('nullList', nullList);
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
        else words.value = [new WordBook("默认词书", [])]
        if (API.getData('nullList')) nullList = TypeJson.parse<number[]>(API.getData('nullList')!);
        if (API.getData('POS')) POS.value = TypeJson.parse<string[]>(API.getData('POS')!);
        if (API.getData('setting'))
            setting.value = TypeJson.parse<Setting>(API.getData('setting')!);
    }

    return {
        addWord,
        getWords,
        rmWords,
        forEach,
        init,
        createWordBook,
        availableWords,
        POS,
        AWM,
        setting,
        words,
        nullList
    };
});
