<template>
    <div style="padding: 25px">
        <el-form :model="form" label-width="auto" style="margin: 5px" @submit.prevent>
            <el-form-item label="新单词：">
                <div class="form">
                    <el-input v-model="form.text" class="flex-grow" @input="newWordInput">
                    </el-input>
                    <el-button
                        :disabled="form.text.trim().is('') || isMeaningEditing || isAITranslating"
                        v-if="dataStore.setting.AISetting.useAi"
                        style="margin-left: 20px"
                        type="primary"
                        @click="AITranslate"
                    >
                        {{ '正在翻译中'.if(isAITranslating).else('AI 翻译') }}
                    </el-button>
                </div>
            </el-form-item>
            <el-form-item label="词义：" style="display: flex">
                <div class="form-c">
                    <div
                        v-for="(value, vid) in form.meaningSet"
                        style="display: flex; flex-direction: column; flex: 1; margin-bottom: 10px"
                    >
                        <el-select
                            v-model="value.POS"
                            default-first-option
                            filterable
                            no-match-text="暂无"
                            placeholder=""
                            style="width: 200px; margin-bottom: 5px"
                            @change="form.mergeMeaning()"
                        >
                            <el-option v-for="value in dataStore.POS" :key="value" :value="value">
                                <em>{{ value }}.</em>
                            </el-option>
                            <template #label="{ label }">
                                <em>{{ label }}.</em>
                            </template>
                        </el-select>
                        <div
                            v-for="(mn, id) in value!.meaning"
                            style="display: flex; align-items: center; margin-bottom: 5px"
                        >
                            <el-input
                                v-model="form.meaningSet[vid].meaning[id].text"
                                :prefix-icon="
                                    mn.source.is(SourceStatus.WordBook) && isWordRef
                                        ? 'Notebook'
                                        : mn.source.is(SourceStatus.AI)
                                          ? 'Promotion'
                                          : ''
                                "
                            >
                            </el-input>
                            <el-tooltip content="删除" effect="dark" placement="left">
                                <el-icon
                                    size="20px"
                                    style="margin-left: 10px"
                                    @click="form.rmMeaning(vid, id)"
                                >
                                    <DeleteFilled />
                                </el-icon>
                            </el-tooltip>
                        </div>
                    </div>

                    <input-label
                        ref="meaningInputRef"
                        placeholder="输入新的词义，可以在词义前使用词性进行标记，例如：n.名词"
                    >
                    </input-label>

                    <el-button v-if="!isMeaningEditing" type="primary" @click="addOneMeaning">
                        +1 词义
                    </el-button>
                </div>
            </el-form-item>

            <el-form-item label="同义形式">
                <div class="form-c">
                    <div
                        v-for="(v, id) in form.synForm"
                        style="display: flex; align-items: center; margin-bottom: 5px"
                    >
                        <el-input
                            v-model="form.synForm[id].word"
                            :prefix-icon="
                                v.source.is(SourceStatus.WordBook) && isWordRef ? 'Notebook' : ''
                            "
                        >
                        </el-input>
                        <el-tooltip content="删除" effect="dark" placement="left">
                            <el-icon
                                size="20px"
                                style="margin-left: 10px"
                                @click="form.rmSynForm(id)"
                            >
                                <DeleteFilled />
                            </el-icon>
                        </el-tooltip>
                    </div>
                    <el-button v-if="!isSynFormEditing" type="primary" @click="addOneSynForm">
                        +1 同义形式
                    </el-button>
                    <input-label
                        ref="synFormInputRef"
                        placeholder="输入这个单词的另外一种写法"
                    ></input-label>
                </div>
            </el-form-item>

            <el-form-item label="注释">
                <el-input
                    v-model="form.note"
                    type="textarea"
                    placeholder="输入注释"
                    :autosize="{ minRows: 2, maxRows: 8 }"
                />
            </el-form-item>

            <el-form-item v-if="!(isMeaningEditing || isSynFormEditing)">
                <el-button
                    type="primary"
                    @click="rmMeaningBySource(SourceStatus.AI)"
                    v-if="dataStore.setting.AISetting.useAi"
                >
                    清除所有 AI 翻译的词义
                </el-button>
                <el-button
                    :disabled="
                        form.text.trim() === '' || form.meaningSet.length === 0 || isAITranslating
                    "
                    type="primary"
                    @click="onSubmit"
                >
                    {{ isWordRef ? '更新' : '创建' }}
                </el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, type Ref } from 'vue';
import { useData } from '@/data/data';
import { ElButton, ElForm, ElFormItem, ElIcon, ElInput, ElMessage, ElNotification, ElSelect, } from 'element-plus';
import { SourceStatus, Word, WordMeaning, WordMeaningSet } from '@/data/modal';
import { DeleteFilled } from '@element-plus/icons-vue';
import InputLabel from '@/component/InputLabel.vue';
import Input from '@/component/InputLabel.vue';
import { TypeJson } from '@/utils/TypeJson.ts';
import { translate } from '@/utils/utils.ts';

const dataStore = useData();

const form = ref<Word>(new Word(-1, '', []));
const form_cache = ref<Word | null>(null);

const isMeaningEditing = ref(false);
const meaningInputRef: Ref<InstanceType<typeof InputLabel> | null> = ref(null);

function addOneMeaning() {
    isMeaningEditing.value = true;
    nextTick(() => {
        meaningInputRef.value?.display().then((res) => {
            isMeaningEditing.value = false;
            if (res !== '') {
                let dotPos = -1;
                for (let i = 0; i < res.length; i++) {
                    if (res[i] === '.') {
                        dotPos = i;
                        break;
                    }
                }
                if (dotPos !== -1) {
                    const pos = res.slice(0, dotPos).trim();
                    const meaning = res.slice(dotPos + 1).trim();
                    if (dataStore.POS.indexOf(pos) === -1 || meaning === '') {
                        form.value.addMeaning(res.trim().toWM());
                        return;
                    }
                    form.value.addMeaning(meaning.toWM(), pos);
                } else {
                    form.value.addMeaning(res.trim().toWM());
                }
            }
        });
    });
}

function onSubmit() {
    dataStore.addWord(
        form.value.text,
        form.value.meaningSet as WordMeaningSet[],
        form.value.synForm.map((v) => v.word),
        form.value.note,
        isWordRef.value ? dataStore.AWM.truct : dataStore.AWM.append
    );
    ElNotification({
        title: '学习成功！',
        message: `单词“${form.value.text}”${isWordRef.value ? '已更新' : '已创建'}！`,
    });
    form.value = new Word(-1, '', []);
}

const isWordRef: Ref<boolean> = ref(false);

function tryFindWord(hasErrorInfo: boolean = true, hasSuccInfo: boolean = true) {
    const w = dataStore.getWords(form.value.text);
    if (w.length !== 0) {
        form_cache.value = TypeJson.copy(form.value);
        isWordRef.value = true;
        // 清除之前的导入内容
        rmMeaningBySource(SourceStatus.WordBook);

        w[0].synForm.forEach((f) => {
            form.value.addSynForm(f.word, SourceStatus.WordBook);
        });
        w[0].meaningSet.forEach((mn) => {
            mn.meaning.forEach((_, id, ls) => {
                ls[id].source = SourceStatus.WordBook;
            });
            form.value.addMeaning(mn);
        });
        form.value.note = w[0].note;
        form.value = TypeJson.copy(form.value); // 为了清除引用
        if (hasSuccInfo)
            ElNotification({
                title: '加载成功',
                message: `成功加载单词：${form.value.text}`,
                type: 'success',
            });
    } else if (hasErrorInfo) {
        ElNotification({
            title: '加载失败',
            message: `找不到单词：${form.value.text}`,
            type: 'error',
        });
    }
}

// 同义形式
const isSynFormEditing = ref(false);
const synFormInputRef: Ref<InstanceType<typeof Input> | null> = ref(null);

function addOneSynForm() {
    isSynFormEditing.value = true;
    nextTick(() => {
        synFormInputRef.value?.display().then((res: string) => {
            isSynFormEditing.value = false;
            if (res != '') {
                form.value.addSynForm(res);
            }
        });
    });
}

// 单词的关联和取消关联
function newWordInput(value: string) {
    if (isWordRef.value) {
        isWordRef.value = false;
        rmMeaningBySource(SourceStatus.WordBook);
        form.value.text = value;
        form.value.note = form_cache.value?.note!;
        form_cache.value = null;
    }
    if (form.value.text != '') {
        const txt = form.value.text;
        setTimeout(() => {
            if (form.value.text === txt) {
                tryFindWord(false, false);
            }
        }, 200);
    }
}

/**
 * 删除所有来源为source的词义
 * @param source 目标来源
 */
function rmMeaningBySource(source: SourceStatus) {
    for (let mns = form.value.meaningSet.length - 1; mns >= 0; mns--) {
        const meaningSetElement = form.value.meaningSet[mns];
        for (let mn = meaningSetElement.meaning.length - 1; mn >= 0; mn--) {
            const meaningElement = meaningSetElement.meaning[mn];
            if (meaningElement.source === source) {
                form.value.rmMeaning(mns, mn);
            }
        }
    }

    for (let i = form.value.synForm.length - 1; i >= 0; i--) {
        const v = form.value.synForm[i];
        if (v.source === source) {
            form.value.rmSynForm(i);
        }
    }
}

// AI翻译
const isAITranslating = ref(false);
function AITranslate() {
    const setting = dataStore.setting.AISetting;
    if (setting.apiKey === '' || setting.lang === '' || setting.modal === '') {
        ElNotification({
            title: '翻译失败',
            message: `信息填写不完全，请到设置——AI补充信息。`,
            type: 'error',
        });
        return;
    }
    isAITranslating.value = true;
    rmMeaningBySource(SourceStatus.AI);
    translate(setting.apiKey, setting.modal, form.value.text, setting.lang)
        .then((res) => {
            if (res === 'Not Found') {
                ElMessage({
                    message: `无效单词`,
                    type: 'error',
                });
                return;
            }
            const obj: {
                pos: string;
                meanings: string[];
            }[] = JSON.parse(res);
            console.log(res);
            obj.forEach((v) => {
                const POS =
                    dataStore.POS.findIndex((pos) => pos === v.pos) !== -1 ? v.pos : undefined;
                const meaningList: Array<WordMeaning> = [];
                v.meanings.forEach((mn: string) => {
                    const meaning = mn.toWM();
                    meaning.source = SourceStatus.AI;
                    meaningList.push(meaning);
                });
                form.value.addMeaning(meaningList, POS);
            });
            ElMessage({
                message: `成功翻译单词`,
                type: 'info',
            });
        })
        .catch((e) => {
            ElMessage({
                message: `翻译失败，${e}`,
                type: 'error',
            });
        })
        .finally(() => {
            isAITranslating.value = false;
        });
}
</script>

<style scoped>
.form-c {
    display: flex;
    flex-direction: column;
    width: 100%;
}
.form {
    display: flex;
    width: 100%;
}
</style>
