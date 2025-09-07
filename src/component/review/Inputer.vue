<template>
    <div class="centered-input-container">
        <div
            ref="inputElement"
            :contenteditable="props.disabled ? 'false' : 'plaintext-only'"
            :data-placeholder="props.disabled ? props.disablePlaceholder : props.placeholder"
            class="centered-input"
            spellcheck="false"
            @blur="handleBlur"
            @focus="handleFocus"
            @input="handleInput"
            @keydown="handleKeydown"
            @mousedown="handleMouseDown"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

function eraseEnter(str: string) {
    return str.replace(/\n/g, '').trim();
}

const props = withDefaults(
    defineProps<{
        placeholder?: string;
        disabled?: boolean;
        disablePlaceholder?: string;
    }>(),
    {
        placeholder: '请输入内容',
        disablePlaceholder: '无法输入',
        disabled: false,
    }
);

const valueModel = defineModel<string>('value');

// 定义组件事件
const emit = defineEmits<{
    (e: 'focus'): void;
    (e: 'blur'): void;
    (e: 'input:enter'): void;
    (e: 'input:other'): void;
}>();

const inputElement = ref<HTMLElement | null>(null);
const isFocused = ref(false);

// 处理输入事件
const handleInput = (event: Event) => {
    const target = event.target as HTMLElement;
    const text = target.innerText;
    valueModel.value = eraseEnter(text);
};

// 处理聚焦事件
const handleFocus = (event: Event) => {
    if (props.disabled) return;
    const target = event.target as HTMLElement;
    const text = target.innerText;
    if (text === '') target.innerHTML = '<br>';
    isFocused.value = true;
    emit('focus');
};

// 处理失去焦点事件
const handleBlur = (event: Event) => {
    if (props.disabled) return;
    isFocused.value = false;
    const target = event.target as HTMLElement;
    const text = target.innerText;
    if (text === '\n') target.innerHTML = '';
    emit('blur');
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
    if (props.disabled) {
        event.preventDefault();
        return;
    }
    // 阻止回车键换行
    if (event.key === 'Enter') {
        event.preventDefault();
        emit('input:enter');
    } else {
        emit('input:other');
    }
    if (event.key === 'Backspace') {
        const target = event.target as HTMLElement;
        const text = target.innerText;
        if (eraseEnter(text).length === 1) {
            event.preventDefault();
            target.innerHTML = '<br>';
        } else if (eraseEnter(text).length === 0) event.preventDefault();
    }
};

function handleMouseDown(e: MouseEvent) {
    if (props.disabled) return;
    if (inputElement.value && inputElement.value.innerText === '') {
        e.preventDefault();
        inputElement.value.innerHTML = `<br>`;
        inputElement.value.focus();
    }
}

// 监听外部值变化
watch(valueModel, (newValue) => {
    if (newValue === '') {
        valueModel.value = '\n';
        return;
    }
    if (inputElement.value && inputElement.value.innerText !== newValue) {
        inputElement.value.innerText = newValue!;
    }
});

// 初始化
onMounted(() => {
    if (inputElement.value && valueModel.value) {
        inputElement.value.innerText = valueModel.value === '' ? '\n' : valueModel.value;
    }
});

// 提供焦点方法
const focus = () => {
    if (props.disabled) return;
    if (inputElement.value) {
        inputElement.value.focus();
    }
};

// 提供清空方法
const clear = () => {
    if (props.disabled) return;
    if (inputElement.value) {
        inputElement.value.innerText = '';
        valueModel.value = '';
    }
};

// 暴露方法给父组件
defineExpose({
    focus,
    clear,
});
</script>

<style scoped>
.centered-input-container {
    position: relative;
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.3s;
    margin-right: 4px;
}

.centered-input {
    width: 100%;
    height: 100%;
    padding: 20px;
    font-size: 30px;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow-wrap: break-word;
    overflow-y: auto;
    white-space: pre-wrap;
}

.centered-input:not(:focus):empty::before {
    content: attr(data-placeholder);
    color: #aab2c0;
}
</style>
