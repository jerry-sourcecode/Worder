<template>
	<el-input
		v-model="input"
		ref="inputRef"
		:placeholder="props.placeholder"
		@keyup.enter="handleInputEnter"
		@blur="handleBlur"
		v-if="isShow" />
</template>

<script setup lang="ts">
import { type InputInstance, ElInput } from "element-plus";
import { nextTick, ref } from "vue";

const props = defineProps<{
	placeholder?: string;
	default?: string;
}>();

const input = ref<string>(props.default ?? "");
const isShow = ref(false);

const inputRef = ref<InputInstance | null>(null);

function display() {
	isShow.value = true;
	nextTick(() => {
		inputRef.value?.focus();
	});
}

function handleInputEnter() {
	inputRef.value?.blur();
}

function handleBlur() {
	isShow.value = false;
	emit("input-done", input.value);
	input.value = "";
}

const emit = defineEmits<{
	(e: "input-done", value: string): void;
}>();

defineExpose({
	display,
});
</script>

<style scoped></style>
