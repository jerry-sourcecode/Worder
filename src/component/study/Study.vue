<template>
    <div style="padding: 25px">
        <el-form :model="form" label-width="auto" style="margin: 5px" @submit.prevent>
            <el-form-item label="新单词：">
                <div class="form">
                    <el-input
                        v-model="form.text"
                        class="flex-grow"
                        @blur="newWordBlur"
                        @input="newWordInput"
                        @keydown.enter="newWordBlur"
                    >
                    </el-input>
                    <el-button
                        :disabled="form.text.trim() === '' || isMeaningEditing"
                        style="margin-left: 20px"
                        type="primary"
                        @click="tryFindWord"
                    >
                        从单词本中查找
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
                            v-for="(_, id) in value!.meaning"
                            style="display: flex; align-items: center; margin-bottom: 5px"
                        >
                            <el-input
                                v-model="form.meaningSet[vid].meaning[id].text"
                                :prefix-icon="
                                    oriMeaningSet.has(value.POS + '.' + value.meaning[id].text) &&
                                    isWordRef
                                        ? 'Notebook'
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
                            v-model="form.synForm[id]"
                            :prefix-icon="oriSynForm.has(v) && isWordRef ? 'Notebook' : ''"
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

            <el-form-item v-if="!(isMeaningEditing || isSynFormEditing)">
                <el-button
                    :disabled="form.text.trim() === '' || form.meaningSet.length === 0"
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
import { ElButton, ElForm, ElIcon, ElInput, ElMessage, ElNotification, ElSelect, } from 'element-plus';
import { Word, WordMeaningSet } from '@/data/modal';
import { DeleteFilled } from '@element-plus/icons-vue';
import InputLabel from '@/component/InputLabel.vue';
import Input from '@/component/InputLabel.vue';
import TypeJson from '@/utils/TypeJson.ts';

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
    const word = new Word(
        -1,
        form.value.text,
        form.value.meaningSet as WordMeaningSet[],
        form.value.synForm
    );
    dataStore.addWord(
        word.text,
        word.meaningSet,
        word.synForm,
        isWordRef.value ? dataStore.AWM.truct : dataStore.AWM.append
    );
    ElNotification({
        title: '学习成功！',
        message: `单词“${word.text}”${isWordRef.value ? '已更新' : '已创建'}！`,
    });
    form.value = new Word(-1, '', []);
}

const isWordRef: Ref<boolean> = ref(false);
const oriMeaningSet: Ref<Set<string>> = ref(new Set());

function tryFindWord(hasWrongInfo: boolean = true) {
    const w = dataStore.getWords(form.value.text);
    if (w.length !== 0) {
        isWordRef.value = true;
        form_cache.value = TypeJson.copy(form.value);
        oriSynForm.value.clear();
        oriMeaningSet.value.clear();
        w[0].synForm.forEach((f) => {
            oriSynForm.value.add(f);
            form.value.addSynForm(f);
        });
        w[0].meaningSet.forEach((mn) => {
            form.value.addMeaning(mn);
            mn.meaning.forEach((m) => oriMeaningSet.value.add(mn.POS + '.' + m.text));
        });
        ElMessage({
            message: `成功加载单词：${form.value.text}`,
            type: 'info',
        });
    } else if (hasWrongInfo) {
        ElMessage({
            message: `找不到单词：${form.value.text}`,
            type: 'error',
        });
    }
}

// 同义形式
const oriSynForm: Ref<Set<string>> = ref(new Set());
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
function newWordBlur() {
    if (!isWordRef.value) {
        tryFindWord(false);
    }
}

function newWordInput(value: string) {
    if (isWordRef.value) {
        isWordRef.value = false;
        form.value = TypeJson.copy(form_cache.value!);
        form.value.text = value;
        form_cache.value = null;
    }
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
