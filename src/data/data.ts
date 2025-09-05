import {defineStore} from "pinia";
import {Setting, Word, type WordMeaning, WordMeaningSet} from "./modal.ts";
import {computed, ref, type Ref, watch} from "vue";
import API from "@/utils/api.ts";
import TypeJson from "@/utils/TypeJson.ts";

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

export const useData = defineStore("data", () => {
  const words: Ref<(Word | null)[]> = ref([]);
  const POS: Ref<string[]> = ref([
    "unknown",
    "n",
    "v",
    "adj",
    "adv",
    "pron",
    "num",
    "art",
    "int",
    "prep",
    "conj",
    "aux",
  ]);
  const setting = ref(new Setting());
  // 记录被删除单词的位置
  let nullList: number[] = [];
  /**
   * 添加单词
   * @param word 单词文本
   * @param meanings 词义列表
   * @param mode 添加单词的模式
   */
  function addWord(word: string, meanings: WordMeaningSet[], mode?: AWM): void;
  function addWord(word: string, meanings: WordMeaning[][], mode?: AWM): void;
  function addWord(
    word: string,
    meanings: (WordMeaningSet | WordMeaning[])[],
    mode: AWM = AWM.append,
  ): void {
    const wd = new Word(words.value.length, word, meanings);
    let hasChanged = false;
    words.value.forEach((v, id) => {
      if (v === null) return;
      if (v.text === word) {
        if (mode === AWM.truct) words.value[id]!.clearMeaning();
        wd.meaningSet.forEach((m) => {
          words.value[id]!.addMeaning(m);
        });
        hasChanged = true;
        return;
      }
    });
    if (hasChanged) return;
    if (nullList.length == 0) {
      words.value.push(wd);
    } else {
      words.value[nullList[0]] = new Word(nullList[0], word, meanings);
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
    if (typeof param === "string") {
      words.value.forEach((w) => {
        if (w === null) return;
        if (w.text === param) {
          ans.push(w);
        }
      });
    } else if (typeof param === "number") {
      return words.value[param];
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
    if (typeof param === "string") {
      words.value.forEach((w, i) => {
        if (w === null) return;
        if (w.text === param) {
          rmpos.push(i);
        }
      });
    } else if (typeof param === "number") {
      if (words.value[param] === null) return;
      rmpos.push(param);
    } else {
      words.value.forEach((w, i) => {
        if (w === null) return;
        if (w.text === param.text) {
          rmpos.push(i);
        }
      });
    }
    rmpos.forEach((i) => {
      words.value[i] = null;
      nullList.push(i);
    });
  }

  /**
   * 遍历所有单词
   * @param callbackfn 回调函数
   */
  function forEach(callbackfn: (value: Word, index: number) => void) {
    words.value.forEach((w, i) => {
      if (w === null) return;
      callbackfn(w, i);
    });
  }
  /**
   * 获取所有可用单词，请不要使用id索引此列表。
   * @returns 可用单词列表
   */
  const availableWords = computed(() => {
    return words.value.filter((word) => word !== null);
  });

  watch(
    words,
    (n) => {
      API.setData("words", n);
      API.setData("nullList", nullList);
    },
    { deep: true },
  );

  watch(
    POS,
    (n) => {
      API.setData("POS", n);
    },
    { deep: true },
  );

  watch(
    setting,
    (n) => {
      API.setData("setting", n);
    },
    { deep: true },
  );

  /**
   * 从本地加载数据
   */
  function init() {
    if (API.getData("words"))
      words.value = TypeJson.parse<Word[]>(API.getData("words"));
    if (API.getData("nullList"))
      nullList = TypeJson.parse<number[]>(API.getData("nullList"));
    if (API.getData("POS"))
      POS.value = TypeJson.parse<string[]>(API.getData("POS"));
    if (API.getData("setting"))
      setting.value = TypeJson.parse<Setting>(API.getData("setting"));
  }

  return {
    addWord,
    getWords,
    rmWords,
    forEach,
    init,
    availableWords,
    POS,
    AWM,
    setting,
    words,
  };
});