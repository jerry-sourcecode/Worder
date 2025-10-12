<template>
    <div style="display: flex; height: 100%">
        <el-splitter v-if="state !== `NoData`" layout="vertical">
            <el-splitter-panel :resizable="false" size="40%">
                <div class="flex panel h-full">
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
                            style="font-size: 20px"
                        >
                            其他释义：
                            <span v-for="item in curProblem?.otherMeaning">
                                <span>{{ item.text }}；</span>
                            </span>
                        </div>
                        <div
                            v-html="toHtml(currentWord?.note!)"
                            style="font-size: 20px"
                            class="c-flex center-align center-main"
                        />
                    </div>
                </div>
            </el-splitter-panel>
            <el-splitter-panel size="50%">
                <div class="c-flex" style="height: 100%">
                    <el-input
                        v-model="transText"
                        placeholder="在此输入翻译的结果"
                        class="h-full"
                        :input-style="
                            `font-size: 40px; height: 100%; text-align:center;` +
                            `color: #f56c6c;`
                                .if(state === 'Wrong')
                                .elif(state === `Correct`, `color: #67c23a;`)
                        "
                        @keydown="onInputKeyDown($event)"
                    />
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
        <div class="flex center-main center-align w-full" v-if="state === 'NoData'">
            <el-empty description="所有的单词都复习完了" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref, ref, watch } from 'vue';
import { ElButton, ElEmpty, ElSplitter, ElSplitterPanel } from 'element-plus';
import { useData } from '@/data/data';
import { ReviewMode, Word, WordMeaning } from '@/data/modal';
import { calcProficiency, getWordPriority, toHtml } from '@/utils/utils';
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
    let minWordId = '',
        minWord: Word | null = null,
        minMode: ReviewMode = ReviewMode.ByWord;
    let reviewContent = dataStore.setting.reviewContent;
    if (!reviewContent.byWord && !reviewContent.byMeaning) return undefined;
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
                minWordId === '' ||
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
    return dataStore.getWordsById(minWordId) ?? undefined;
}

function onInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
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
    const wm: WordMeaning =
        currentWord.value?.meaningSet[currentWordSid.value!].meaning[currentWordMid.value!]!;
    let correct: string;
    if (curMode.value === ReviewMode.ByMeaning) correct = currentWord.value!.text;
    else correct = wm.text;
    let userAnswer = transText.value;
    if (dataStore.setting.ignoreCase) {
        // 对大小写进行设置
        userAnswer = userAnswer.toLowerCase();
        correct = correct?.toLowerCase();
    }
    if (userAnswer === correct || isCorrectForSynForm()) {
        if (errCount.value === 0) wm.review(true, curMode.value); // 只在首次作答时记录
        errCount.value = 0;
        state.value = 'Correct';
    } else {
        if (errCount.value === 0) wm.review(false, curMode.value); // 只在首次作答时记录
        errCount.value++;
        state.value = 'Wrong';
    }
    function isCorrectForSynForm() {
        if (curMode.value === ReviewMode.ByMeaning) {
            let istrue = false;
            currentWord.value?.synForm.forEach((f) => {
                if (f.word === userAnswer) istrue = true;
            });
            if (istrue) return true;
        }
        return false;
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
