<!--
API说明：
属性：
- placeholder: string：占位字符
- default: string：默认数据
方法：
display(value?: string): Promise<string>
- 创建时，输入框时隐藏的，这个方法回让输入框显现，并自动聚焦，在输入框失焦后，输入框自动隐藏
- 参数value：初始值，默认为prop.default
- 返回值：Promise<string>，输入结果
    - 兑现时机：输入框失焦时
    - 拒绝时机：无
事件：
input-done: (value: string) => void
- 触发时机：输入框失焦时
- 参数value：输入框内容
-->
<template>
    <el-input
        v-if="isShow"
        ref="inputRef"
        v-model="input"
        :placeholder="props.placeholder"
        @blur="handleBlur"
        @keyup.enter="handleInputEnter"
    />
</template>

<script setup lang="ts">
import { ElInput, type InputInstance } from 'element-plus';
import { nextTick, ref } from 'vue';

const props = defineProps<{
    placeholder?: string;
    default?: string;
}>();

const input = ref<string>(props.default ?? '');
const isShow = ref(false);

const inputRef = ref<InputInstance | null>(null);

function display(value: string = props.default ?? '') {
    isShow.value = true;
    input.value = value;
    nextTick(() => {
        inputRef.value?.focus();
    });
    return new Promise<string>((resolve, reject) => {
        const handleResolve = (value: string) => {
            resolve(value);
            displayPromise = null;
        };
        displayPromise = { resolve: handleResolve, reject };
    });
}

let displayPromise: { resolve: (value: string) => void; reject: (reason?: any) => void } | null =
    null;

function handleBlur() {
    isShow.value = false;
    emit('input-done', input.value);
    if (displayPromise) {
        displayPromise.resolve(input.value);
    }
    input.value = '';
}

function handleInputEnter() {
    inputRef.value?.blur();
}

const emit = defineEmits<{
    (e: 'input-done', value: string): void;
}>();

defineExpose({
    display,
});
</script>

<style scoped></style>
