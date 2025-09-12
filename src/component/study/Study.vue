<template>
    <div style="padding: 25px">
        <el-form :model="form" label-width="auto" style="margin: 5px" @submit.prevent>
            <el-form-item label="新单词：">
                <div class="flex w-full">
                    <el-input v-model="form.text" class="flex-grow" @input="isWordRef = false">
                    </el-input>
                    <el-button
                        :disabled="form.text.trim() === '' || isEditing"
                        style="margin-left: 20px"
                        type="primary"
                        @click="tryFindWord"
                    >
                        从单词本中查找
                    </el-button>
                </div>
            </el-form-item>
            <el-form-item label="词义：" style="display: flex">
                <div style="display: flex; flex-direction: column; width: 100%">
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

                    <el-input
                        v-if="isEditing"
                        ref="inputRef"
                        v-model="editText"
                        placeholder="输入新的词义，可以在词义前使用词性进行标记"
                        @blur="inputMeaningBlur"
                        @keyup.enter="inputRef?.blur()"
                    />

                    <el-button v-if="!isEditing" type="primary" @click="addOneMeaning">
                        +1 词义
                    </el-button>
                </div>
            </el-form-item>

            <el-form-item v-if="!isEditing">
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
import {
    ElButton,
    ElForm,
    ElIcon,
    ElInput,
    ElMessage,
    ElNotification,
    ElSelect,
    type InputInstance,
} from 'element-plus';
import { Word, WordMeaningSet } from '@/data/modal';
import { DeleteFilled } from '@element-plus/icons-vue';

const dataStore = useData();

const form = ref<Word>(new Word(-1, '', []));

const isEditing = ref(false);
const editText = ref('');
const inputRef: Ref<undefined | InputInstance> = ref();

function addOneMeaning() {
    isEditing.value = true;
    editText.value = '';
    nextTick(() => {
        inputRef.value?.focus();
    });
}
function inputMeaningBlur() {
    isEditing.value = false;
    if (editText.value !== '') {
        let dotPos = -1;
        for (let i = 0; i < editText.value.length; i++) {
            if (editText.value[i] === '.') {
                dotPos = i;
                break;
            }
        }
        if (dotPos !== -1) {
            const pos = editText.value.slice(0, dotPos).trim();
            const meaning = editText.value.slice(dotPos + 1).trim();
            if (dataStore.POS.indexOf(pos) === -1 || meaning === '') {
                form.value.addMeaning(editText.value.trim().toWM());
                return;
            }
            form.value.addMeaning(meaning.toWM(), pos);
        } else {
            form.value.addMeaning(editText.value.trim().toWM());
        }
    }
}

function onSubmit() {
    const word = new Word(-1, form.value.text, form.value.meaningSet as WordMeaningSet[]);
    dataStore.addWord(
        word.text,
        word.meaningSet,
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

function tryFindWord() {
    const w = dataStore.getWords(form.value.text);
    if (w.length !== 0) {
        isWordRef.value = true;
        w[0].meaningSet.forEach((mn) => {
            form.value.addMeaning(mn);
            mn.meaning.forEach((m) => oriMeaningSet.value.add(mn.POS + '.' + m.text));
        });
    } else {
        ElMessage({
            message: `找不到单词：${form.value.text}`,
            type: 'error',
        });
    }
}
</script>

<style scoped></style>
