<template>
    <div style="height: 100vh">
        <el-splitter v-if="state !== `NoData`" layout="vertical">
            <el-splitter-panel :resizable="false" size="40%">
                <div class="flex panel" style="height: 100%">
                    <div class="c-flex">
                        <div style="margin-left: auto; margin-right: auto">
                            <em v-if="curProblem!.POS !== `unknown`" style="margin-right: 15px">
                                {{ curProblem!.POS + '.' }}
                            </em>
                            {{ curProblem!.text }}
                        </div>
                        <div
                            v-if="
                                curMode == ReviewMode.ByWord && curProblem!.otherMeaning!.length > 0
                            "
                            style="font-size: 25px"
                        >
                            其他释义：
                            <span v-for="item in curProblem?.otherMeaning">
                                <span>{{ item.text }}；</span>
                            </span>
                        </div>
                    </div>
                </div>
            </el-splitter-panel>
            <el-splitter-panel size="50%">
                <div class="c-flex" style="height: 100%">
                    <Inputer
                        v-model:value="transText"
                        :class="
                            `input-wrong`
                                .if(state === 'Wrong')
                                .elif(state === `Correct`, `input-correct`)
                        "
                        placeholder="在此输入翻译的结果"
                        @input:enter="onInputerInput(`Enter`)"
                        @input:other="onInputerInput(`Other`)"
                    ></Inputer>
                </div>
            </el-splitter-panel>
            <el-splitter-panel
                :class="`bk-wrong`.if(state === 'Wrong').elif(state === 'Correct', `bk-correct`)"
                size="10%"
                style="display: flex; align-items: center; height: 100%"
            >
                <div v-if="state !== 'Answering'" style="margin-left: 30px">
                    <el-result
                        :icon="'success'.if(state === 'Correct').else('error')"
                        style="padding: 0"
                    />
                </div>
                <div style="margin-left: 20px; font-size: x-large">
                    <div v-if="state === 'Wrong'" class="wrong-tip">
                        翻译错误！{{
                            `正确答案是：${currentWord!.text}`
                                .if(errCount >= 3)
                                .elif(errCount >= 2, `第一个字符是：${currentWord!.text.charAt(0)}`)
                                .else('继续努力！')
                        }}
                    </div>
                    <div v-if="state === 'Correct'" class="correct-tip">翻译正确！</div>
                </div>
                <div style="margin-right: 50px; margin-left: auto">
                    <el-button
                        class="action-button"
                        size="large"
                        type="success"
                        @click="checkTranslation"
                    >
                        {{
                            '继续'
                                .if(state === 'Correct')
                                .elif(errCount >= 1, '订正')
                                .else('检查')
                        }}
                    </el-button>
                </div>
            </el-splitter-panel>
        </el-splitter>
        <el-empty v-else description="所有单词都复习完了，快去学习吧" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref, ref, watch } from 'vue';
import { ElButton, ElEmpty, ElSplitter, ElSplitterPanel } from 'element-plus';
import Inputer from '@/component/review/Inputer.vue';
import { useData } from '@/data/data';
import { ReviewMode, Word, WordMeaning } from '@/data/modal';
import { calcProficiency, calcTimeDiffLevel } from '@/utils/utils';
import { useRouter } from 'vue-router';

/** 当前的单词 */
const currentWord = ref<Word | undefined>();
/** 当前释义所在集合的下标，Set index */
const currentWordSid = ref<number | undefined>();
/** 当前释义所在集合中的下标，Meaning index */
const currentWordMid = ref<number | undefined>();

/** 失败了几次 */
const errCount = ref(0);
/** 当前复习的模式 */
const curMode: Ref<ReviewMode> = ref(ReviewMode.ByWord);

/**
 * 状态
 * - "Answering"：正在作答
 * - "Wrong"：反馈状态，代指作答错误
 * - "Correct"：反馈状态，代指作答正确
 * - "NoDate"：无数据
 */
const state = ref<'Answering' | 'Wrong' | 'Correct' | 'NoData'>('NoData');

/**
 * 当前问题
 * @return
 * 如果curMode为ReviewMode.Meaning时，返回一个对象
 * - POS：词性
 * - text：文字
 *
 * 否则，如果curMode为ReviewMode.Word时，返回一个对象
 * - POS：词性
 * - text：单词
 * - otherMeaning：其他释义
 *
 * 当没有数据时，会为undefined
 */
const curProblem = computed(() => {
    const defaultContent = undefined;
    if (state.value === 'NoData') {
        return defaultContent;
    }
    const wordMeaningSet = currentWord.value?.meaningSet[currentWordSid.value ?? -1]!;
    if (!wordMeaningSet) return defaultContent;
    if (curMode.value === ReviewMode.ByMeaning) {
        return {
            POS: wordMeaningSet.POS,
            text: wordMeaningSet.meaning[currentWordMid.value ?? -1].text,
        };
    } else {
        return {
            POS: wordMeaningSet.POS,
            text: currentWord.value?.text,
            otherMeaning: wordMeaningSet.meaning.filter((_, id) => id != currentWordMid.value),
        };
    }
});

const dataStore = useData();
const router = useRouter();

const transText = ref('');

/**
 * 获得下一个需要复习的单词，没有则返回undefined
 */
function getCurrentWord(): Word | undefined {
    let minWordId = -1,
        minWord: Word | null = null,
        minMode: ReviewMode = ReviewMode.ByWord;
    let reviewContent = dataStore.setting.reviewContent;
    if (!reviewContent.byWord && !reviewContent.byMeaning) return undefined;
    /**
     * 获取单词a的优先级
     */
    function getWordPriority(a: Word, reviewMode: ReviewMode): number {
        const data = a.calculateProficiency();
        const wm = a.meaningSet[data.setid].meaning[data.mid];
        const lastReview = wm.getLastReview(reviewMode);
        let reviewInfo;
        if (reviewMode === ReviewMode.ByMeaning) reviewInfo = wm.reviewByMeaningInfo;
        else reviewInfo = wm.reviewByWordInfo;
        const netRtCount = reviewInfo.rightReviewCount - reviewInfo.wrongReviewCount;
        let offset = 0;

        // 对于所有的需要写出词义的练习，其优先级比写出单词低半级
        if (reviewMode === ReviewMode.ByWord) {
            offset += 5;
        }

        // 单词复习的优先级标准
        // 复习生词（一级）
        // - 复习从未复习过的单词（1）
        if (lastReview.date === null) return 1 + offset;

        const timeIntervalLevel = calcTimeDiffLevel(lastReview.date);
        // 复习错误/极不熟练的单词（二级）
        // - 昨天错误的单词（11）
        if (timeIntervalLevel === 'Yesterday' && !lastReview.res) return 11 + offset;
        // - 昨天正确，但是净正确次数少于等于3的单词（12）
        if (timeIntervalLevel === 'Yesterday' && netRtCount <= 3) return 12 + offset;
        // - 所有（不含今天）错误的单词（13）
        if (timeIntervalLevel !== 'Today' && !lastReview.res) return 13 + offset;
        // - 今天错误的单词（14）
        if (!lastReview.res) return 14;
        // 复习正确，但是不熟练的单词（三级）
        // - 近7天（不含今天）正确的单词，但是净正确次数少于等于5的单词（20）
        if (timeIntervalLevel === 'ThisWeek' && netRtCount <= 5) return 20 + offset;
        // - 所有（不含今天）正确，但是净正确次数少于等于7的单词（21）
        if (timeIntervalLevel !== 'Today' && netRtCount <= 7) return 21 + offset;
        // 复习久远的单词（四级）
        // - 一个月以外正确的单词（30）
        if (timeIntervalLevel === 'Oldest') return 30 + offset;
        // >> 一般复习结束
        // 复习其他单词（五级）
        // - 近一个月（不含今天）正确的单词（40）
        if (timeIntervalLevel !== 'Today') return 40 + offset;
        // 复习今天的单词（六级）
        // - 复习今天正确的单词（50）
        if (timeIntervalLevel === 'Today') return Infinity + offset;

        return Infinity + offset;
    }
    dataStore.forEach((v) => {
        const k = v.calculateProficiency();
        const minNum = minWord?.calculateProficiency();
        let mode: ReviewMode;
        // 先观察是以单词为已知复习，还是以释义为已知

        const meaningPri = getWordPriority(v, ReviewMode.ByMeaning);
        const wordPri = getWordPriority(v, ReviewMode.ByWord);
        if (meaningPri === wordPri) {
            const wm = v.meaningSet[k.setid].meaning[k.mid];
            if (calcProficiency(wm.reviewByWordInfo) > calcProficiency(wm.reviewByMeaningInfo))
                mode = ReviewMode.ByMeaning;
            else mode = ReviewMode.ByWord;
        } else {
            if (meaningPri > wordPri) {
                mode = ReviewMode.ByWord;
            } else {
                mode = ReviewMode.ByMeaning;
            }
        }
        if (!reviewContent.byWord) mode = ReviewMode.ByMeaning;
        if (!reviewContent.byMeaning) mode = ReviewMode.ByWord;

        if (getWordPriority(v, mode))
            if (
                minWordId === -1 ||
                getWordPriority(v, mode) < getWordPriority(minWord!, minMode) ||
                (getWordPriority(v, mode) === getWordPriority(minWord!, minMode) &&
                    minNum!.proficiency > k.proficiency)
            ) {
                // 打擂台式比较
                minWordId = v.id;
                minWord = v;
                minMode = mode;
                curMode.value = mode;
                currentWordSid.value = k.setid;
                currentWordMid.value = k.mid;
            }
    });
    if (!minWord || getWordPriority(minWord, minMode) === Infinity) return undefined;
    return dataStore.getWords(minWordId) ?? undefined;
}

function onInputerInput(type: 'Enter' | 'Other') {
    if (type === 'Enter') {
        if (transText.value) checkTranslation();
    } else {
        if (state.value === 'Wrong') {
            state.value = 'Answering';
            transText.value = '';
        }
    }
}

/**
 * 检查翻译是否正确
 */
function checkTranslation() {
    if (state.value === 'Wrong') return;
    if (state.value === 'Correct') {
        transText.value = '';
        state.value = 'Answering';
        rfNewWord();
        return;
    }
    const wm: WordMeaning = dataStore.getWords(currentWord.value!.id)?.meaningSet[
        currentWordSid.value!
    ].meaning[currentWordMid.value!]!;
    let correct: string;
    if (curMode.value === ReviewMode.ByMeaning) correct = currentWord.value!.text;
    else correct = wm.text;
    let userAnswer = transText.value;
    if (dataStore.setting.ignoreCase) {
        // 对大小写进行设置
        userAnswer = userAnswer.toLowerCase();
        correct = correct?.toLowerCase();
    }
    if (userAnswer === correct) {
        if (errCount.value === 0) wm.review(true, curMode.value); // 只在首次作答时记录
        errCount.value = 0;
        state.value = 'Correct';
    } else {
        if (errCount.value === 0) wm.review(false, curMode.value); // 只在首次作答时记录
        errCount.value++;
        state.value = 'Wrong';
    }
}

onMounted(() => {
    rfNewWord();
});

watch(
    () => router.currentRoute.value.path,
    () => {
        rfNewWord();
    },
    { immediate: true, deep: true }
);

/**
 * 刷新
 */
function rfNewWord() {
    const cw = getCurrentWord();
    if (cw === undefined) state.value = 'NoData';
    else {
        state.value = 'Answering';
        currentWord.value = cw;
    }
}
</script>

<style scoped>
.panel {
    align-items: center;
    justify-content: center;
    font-size: 40px;
    flex: 1;
}

.correct-tip,
.wrong-tip {
    font-weight: bold;
    font-size: 1.3em;
    border-radius: 8px;
    padding: 10px 28px;
    margin-bottom: 8px;
    display: inline-block;
    animation: pop-result 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
.correct-tip {
    color: #67c23a;
    text-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}
.wrong-tip {
    color: #f56c6c;
    text-shadow: 0 2px 8px rgba(245, 108, 108, 0.15);
}
@keyframes pop-result {
    0% {
        transform: scale(0.7) rotate(-8deg);
        opacity: 0.2;
    }
    60% {
        transform: scale(1.15) rotate(2deg);
        opacity: 1;
    }
    100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
    }
}

.action-button:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
        0 7px 14px rgba(50, 132, 255, 0.4),
        0 3px 6px rgba(0, 0, 0, 0.1);
}

.action-button:active {
    transform: translateY(1px) scale(0.99);
    box-shadow:
        inset 0 2px 4px rgba(0, 0, 0, 0.2),
        0 1px 2px rgba(50, 132, 255, 0.2);
}
</style>
<style>
.input-correct {
    color: #67c23a;
}

.input-wrong {
    color: #f56c6c;
}

.bk-correct {
    background-color: #b3e19d;
    transition: background-color 1s ease;
}

.bk-wrong {
    background-color: #fab6b6;
    transition: background-color 1s ease;
}
</style>