<!--
## InputLabel 组件

### 效果
- 输入框根据 `isShow` 状态条件性渲染。
- 调用 `display` 方法时，输入框显示并聚焦。
- 失去焦点时，输入框隐藏，并触发 `input-done` 事件，传递当前输入值。

### 属性
- `placeholder`: 设置输入框的占位符文本。
- `default`: 设置输入框的默认值。

### 事件
- `input-done`: 当输入框失去焦点时触发。传递当前输入值作为参数。

### 方法
- `display(value: string)`: 显示输入框并可选地设置初始值，然后聚焦。返回一个 Promise，当输入框失去焦点时解析为输入值。
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
