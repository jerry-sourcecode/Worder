import { calcProficiency } from '@/utils/utils';

type ReviewInfo = {
    /** 首次学习时间 */
    firstLearned: Date;
    /** 上次复习正确时间 */
    lastCorrect: Date | null;
    /** 上次复习错误时间 */
    lastWrong: Date | null;
    /** 正确复习次数 */
    rightReviewCount: number;
    /** 错误复习次数 */
    wrongReviewCount: number;
};

const SortBy = {
    /**
     * 按熟练度优先级
     */
    Priority: 0,
    /**
     * 字典序
     */
    Dictionary: 1,
    /**
     * 创建时间
     */
    CreateTime: 2,
} as const;
type SortBy = (typeof SortBy)[keyof typeof SortBy];

// 复习的方式，即复习时展示的元素
const ReviewMode = {
    /** 展示单词，要求写出意思 */
    ByWord: 0,
    /** 展示意思，要求写出单词 */
    ByMeaning: 1,
} as const;
type ReviewMode = (typeof ReviewMode)[keyof typeof ReviewMode];

// 词义添加的来源
const SourceStatus = {
    /** 普通来源，可能是用户输入 */
    Simple: 0,
    /** 通过AI翻译添加的*/
    AI: 2,
    /** 通过在单词本里搜索添加的 */
    WordBook: 3,
} as const;
type SourceStatus = (typeof SourceStatus)[keyof typeof SourceStatus];

class WordBook {
    /**单词本名*/
    name: string;
    /**单词*/
    words: (Word | null)[];
    constructor(name: string, words: (Word | null)[]) {
        this.words = words;
        this.name = name;
    }
}

class Word {
    /** 单词文本 */
    text: string;
    /** 同义形式 */
    synForm: SynForm[];
    /** 创建时间 */
    createTime: Date;
    /** 注释 */
    note: string;
    /** 词义 */
    private _meaning: WordMeaningSet[];
    /** 单词的唯一标识 */
    private readonly _id: string;

    constructor(
        id: string,
        text: string,
        meaning: (WordMeaningSet | WordMeaning[])[] = [],
        synForm: string[] = [],
        note: string = ''
    ) {
        this.text = text;
        this._id = id;
        this._meaning = [];
        this.synForm = synForm.map((v) => new SynForm(v));
        this.createTime = new Date();
        this.note = note;
        meaning.forEach((item) => {
            if (Array.isArray(item)) {
                this.addMeaning(item);
            } else {
                this.addMeaning(item);
            }
        });
    }

    /** 词义 */
    get meaningSet(): WordMeaningSet[] {
        return this._meaning;
    }

    /** 单词的唯一标识 */
    get id(): string {
        return this._id;
    }

    addSynForm(synForm: string, source: SourceStatus = SourceStatus.Simple) {
        this.synForm.push(new SynForm(synForm, source));
    }
    rmSynForm(id: number) {
        this.synForm.splice(id, 1);
    }

    /**
     * 增加一个词义
     * @param meaning 词义
     * @param partsOfSpeech 词性
     */
    addMeaning(meaning: WordMeaning, partsOfSpeech?: string): WordMeaningSet;
    /**
     * 增加一个词义
     * @param meaning 词义
     * @param partsOfSpeech 词性
     */
    addMeaning(meaning: WordMeaning[], partsOfSpeech?: string): WordMeaningSet;
    /**
     * 增加一个词义集
     * @param meaning 词义集
     */
    addMeaning(meaning: WordMeaningSet): WordMeaningSet;
    addMeaning(
        meaning: WordMeaning[] | WordMeaning | WordMeaningSet,
        partsOfSpeech: string = 'unknown'
    ): WordMeaningSet {
        if (meaning instanceof WordMeaningSet) {
            return this.addMeaning(meaning.meaning, meaning.POS);
        }
        const meaningsArray = Array.isArray(meaning) ? meaning : [meaning];
        let hasAdd = false,
            obj = null;
        this._meaning.forEach((v, id) => {
            if (v.POS === partsOfSpeech) {
                meaningsArray.forEach((m) => v.meaning.push(m));
                v.meaning = Array.from(new Set(v.meaning));
                hasAdd = true;
                obj = id;
                return;
            }
        });
        if (!hasAdd) {
            obj = this._meaning.push(new WordMeaningSet(meaningsArray, partsOfSpeech)) - 1;
        }
        return this._meaning[obj!];
    }
    /**
     * 删除词义
     * @param POS 词性
     * @param meaning 词义
     */
    rmMeaning(POS: string, meaning: string): void;
    /**
     * 删除词义
     * @param POSId 词性的索引
     * @param meaningId 词义的索引
     */
    rmMeaning(POSId: number, meaningId: number): void;
    rmMeaning(POS: string | number, meaning: string | number) {
        if (typeof meaning === 'string' && typeof POS === 'string') {
            this._meaning.forEach((v, id) => {
                if (v.POS === POS) {
                    v.meaning.forEach((m, mid) => {
                        if (m.text === meaning) {
                            POS = id;
                            meaning = mid;
                        }
                    });
                }
            });
        }
        if (typeof meaning === 'number' && typeof POS === 'number') {
            this._meaning[POS].meaning.splice(meaning, 1);
            if (this._meaning[POS].meaning.length === 0) {
                this._meaning.splice(POS, 1);
            }
        }
    }
    /**
     * 清空词义
     */
    clearMeaning(): void {
        this._meaning = [];
    }
    /**
     * 尝试将相同词性合并并去重
     */
    mergeMeaning() {
        const merged: Map<string, number> = new Map();
        // 合并
        this._meaning.forEach((v, id) => {
            if (merged.has(v.POS)) {
                this._meaning[merged.get(v.POS)!].meaning.push(...v.meaning);
                this._meaning.splice(id, 1);
            } else {
                merged.set(v.POS, id);
            }
        });
        // 去重
        this._meaning.forEach((v) => {
            v.meaning = Array.from(new Set(v.meaning));
        });
    }
    /**
     * 计算单词熟练度，单词熟练度被定义为其下词义中的最低熟练度
     * @returns 熟练度信息，包括最低熟练度、对应的解释集索引和词义索引
     */
    calculateProficiency(): {
        proficiency: number;
        setid: number;
        mid: number;
    } {
        let ans = -1,
            minsid = -1,
            minid = -1;
        this._meaning.forEach((mset, sid) => {
            mset.meaning.forEach((m, id) => {
                if (m.calcProficiency() < ans || ans === -1) {
                    ans = m.calcProficiency();
                    minsid = sid;
                    minid = id;
                }
            });
        });
        if (minsid === -1)
            throw new Error(
                `Error while calculate proficiency: Can't find meaning in this word ${this.text}.`
            );
        return {
            proficiency: ans,
            setid: minsid,
            mid: minid,
        };
    }
}

class SynForm {
    word: string;
    source: SourceStatus = SourceStatus.Simple;

    constructor(word: string, source: SourceStatus = SourceStatus.Simple) {
        this.word = word;
        this.source = source;
    }
}

/** 词义集，包括同词性的多个词义 */
class WordMeaningSet {
    /** 词义 */
    meaning: WordMeaning[];
    /** 词性 */
    POS: string;
    constructor(meaning: WordMeaning[] = [], POS: string = '') {
        this.meaning = meaning;
        this.POS = POS;
    }
}

/** 词义 */
class WordMeaning {
    /** 词义 */
    text: string;
    /** 来源 */
    source: SourceStatus = SourceStatus.Simple;
    /** 以将单词作为已知，要求写出词义这种方式进行复习的信息 */
    private readonly _reviewByWordInfo: ReviewInfo;
    /** 以将词义作为已知，要求写出单词这种方式进行复习的信息 */
    private readonly _reviewByMeaningInfo: ReviewInfo;

    constructor(text: string) {
        this.text = text;
        this._reviewByWordInfo = {
            firstLearned: new Date(),
            lastCorrect: null,
            lastWrong: null,
            rightReviewCount: 0,
            wrongReviewCount: 0,
        };
        this._reviewByMeaningInfo = {
            firstLearned: new Date(),
            lastCorrect: null,
            lastWrong: null,
            rightReviewCount: 0,
            wrongReviewCount: 0,
        };
    }

    get reviewByWordInfo(): ReviewInfo {
        return this._reviewByWordInfo;
    }

    get reviewByMeaningInfo(): ReviewInfo {
        return this._reviewByMeaningInfo;
    }

    /**
     * 计算单词熟练度
     * @returns 熟练度分数（0-100，保留4位小数）
     */
    calcProficiency(): number {
        return Math.min(
            calcProficiency(this.reviewByMeaningInfo, new Date()),
            calcProficiency(this.reviewByWordInfo, new Date())
        );
    }
    /**
     * 获得最近一次复习的信息
     * @param source 复习的方式
     * @returns 复习信息
     * - data，复习时间，从未复习过则为 null
     * - res，复习结果，为 true 表示正确，为 false 表示失败
     */
    getLastReview(source: ReviewMode): {
        date: Date | null;
        res: boolean;
    } {
        function getLatest(reviewInfo: ReviewInfo) {
            let lastReview: Date = new Date(),
                res;
            if (reviewInfo.lastCorrect === null) {
                if (reviewInfo.lastWrong === null) {
                    return {
                        date: null,
                        res: false,
                    };
                }
                lastReview = reviewInfo.lastWrong;
                res = false;
            } else {
                if (reviewInfo.lastWrong === null) {
                    lastReview = reviewInfo.lastCorrect;
                    res = true;
                } else {
                    res = reviewInfo.lastCorrect > reviewInfo.lastWrong;
                }
            }
            return {
                date: lastReview,
                res,
            };
        }

        if (source === ReviewMode.ByWord) {
            return getLatest(this.reviewByWordInfo);
        } else {
            return getLatest(this.reviewByMeaningInfo);
        }
    }
    /**
     * 将这个词义作为已知进行复习
     * @param res 复习的结果
     * @param source 是如何复习的
     * - “Word”，给定单词，复习词义
     * - "Meaning"，给定词义，复习单词
     */
    review(res: boolean, source: ReviewMode): void {
        const ref = source === ReviewMode.ByWord ? this.reviewByWordInfo : this.reviewByMeaningInfo;
        if (res) {
            ref.lastCorrect = new Date();
            ref.rightReviewCount++;
        } else {
            ref.lastWrong = new Date();
            ref.wrongReviewCount++;
        }
    }
}

class Setting {
    ignoreCase: boolean = false;
    useAI: boolean = false;
    AISetting: {
        useAi: boolean;
        modal: string;
        apiKey: string;
        lang: string;
    } = {
        useAi: false,
        modal: '',
        apiKey: '',
        lang: '',
    };
    reviewContent: {
        byWord: boolean;
        byMeaning: boolean;
    } = {
        byWord: true,
        byMeaning: true,
    };
    nowWordBookName: string = '默认词书';
    sort: {
        sortBy: SortBy;
        // 倒序排序
        isRev: boolean;
    } = {
        sortBy: SortBy.CreateTime,
        isRev: false,
    };
}

declare global {
    interface String {
        toWM(): WordMeaning;
    }
}

/**
 * 将字符串转化为一个WordMeaning对象
 */
String.prototype.toWM = function (): WordMeaning {
    return new WordMeaning(this.toString());
};

export {
    Word,
    WordMeaningSet,
    WordMeaning,
    Setting,
    WordBook,
    type ReviewInfo,
    ReviewMode,
    SourceStatus,
    SynForm,
    SortBy,
};
