<template>
    <div style="padding: 25px">
        <el-form label-width="auto" @submit.prevent>
            <el-tabs model-value="study">
                <el-tab-pane label="学习" name="study">
                    <el-form-item label="自动在单词本中搜索">
                        <el-switch
                            v-model="dataStore.setting.autoSearchInWordBook"
                            active-color="#13ce66"
                            active-text="开启"
                            inactive-color="#ff4949"
                            inactive-text="关闭"
                        />
                    </el-form-item>
                </el-tab-pane>
                <el-tab-pane label="复习" name="check">
                    <el-form-item label="检查时忽略大小写">
                        <el-switch
                            v-model="dataStore.setting.ignoreCase"
                            active-color="#13ce66"
                            active-text="开启"
                            inactive-color="#ff4949"
                            inactive-text="关闭"
                        />
                    </el-form-item>
                    <el-form-item label="复习形式">
                        <el-checkbox
                            v-model="dataStore.setting.reviewContent.byWord"
                            label="翻译题：给定单词，要求写出其词义。"
                            style="width: 100%"
                        />
                        <el-checkbox
                            v-model="dataStore.setting.reviewContent.byMeaning"
                            label="翻译题：给定词义，要求写出对应单词。"
                        />
                    </el-form-item>
                </el-tab-pane>
                <el-tab-pane label="词性" name="pos">
                    <el-form-item label="可选词性" style="display: flex">
                        <div style="display: flex; flex-direction: column; width: 100%">
                            <div
                                v-for="(data, id) in dataStore.POS"
                                :class="id == 0 ? `item-first` : ``"
                                class="item"
                                @mouseleave="currentHover = null"
                                @mouseover="currentHover = id"
                            >
                                <p style="padding-left: 5px">
                                    <em>{{ data }}</em
                                    >.
                                </p>
                                <el-tooltip content="删除" effect="dark" placement="left">
                                    <el-icon
                                        v-if="currentHover === id && id != 0"
                                        size="20px"
                                        style="margin-right: 10px; margin-left: auto"
                                        @click="dataStore.POS.splice(id, 1)"
                                    >
                                        <DeleteFilled />
                                    </el-icon>
                                </el-tooltip>
                            </div>
                            <div
                                :class="isEditingPOS ? `` : `item-checkable`"
                                class="item item-last"
                                @click="addPOS"
                            >
                                <Input
                                    ref="inputRef"
                                    placeholder="输入新的可选词性"
                                    @input-done="handleInputDone"
                                />
                                <p v-if="!isEditingPOS" style="padding-left: 5px">
                                    增加一个新的可选词性
                                </p>
                            </div>
                        </div>
                    </el-form-item>
                </el-tab-pane>
            </el-tabs>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { useData } from '@/data/data.ts';
import { ref, type Ref } from 'vue';
import { ElForm, ElTabs } from 'element-plus';
import Input from '../InputLabel.vue';
import { DeleteFilled } from '@element-plus/icons-vue';

const dataStore = useData();

const currentHover: Ref<number | null> = ref(null);

const inputRef = ref<InstanceType<typeof Input> | null>(null);

const isEditingPOS = ref(false);
function addPOS() {
    if (isEditingPOS.value) return;
    isEditingPOS.value = true;
    inputRef.value?.display();
}
function handleInputDone(value: string) {
    isEditingPOS.value = false;
    if (value === '') return;
    dataStore.POS.push(value);
}
</script>

<style scoped>
.item {
    border: 2px solid #f1f1f1;
    border-top-width: 0;
    padding: 5px;
    display: flex;
    align-items: center;
}
.item-first {
    border-top-width: 2px;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
}
.item-last {
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
}
.item-checkable {
    cursor: pointer;
    background-color: #e6f0fa;
    color: #409eff;
    font-weight: 500;
    transition:
        background-color 0.2s,
        color 0.2s,
        box-shadow 0.2s;
    border: 2px dashed #b3d8ff;
    border-top-width: 0;
    text-align: center;
    position: relative;
}

.item-checkable:hover {
    background: linear-gradient(90deg, #e0f3ff 0%, #d0eaff 100%);
    color: #0077ff;
    box-shadow: 0 2px 8px 0 rgba(64, 158, 255, 0.08);
    border-color: #409eff;
}

.item-checkable::before {
    content: '+';
    display: inline-block;
    margin-right: 8px;
    margin-left: 5px;
    font-size: 18px;
    vertical-align: middle;
    color: #409eff;
    transition: color 0.2s;
}

.item-checkable:hover::before {
    color: #0077ff;
}

@keyframes itemCheckableClick {
    0% {
        box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.15);
        background-color: #e6f0fa;
    }
    50% {
        box-shadow: 0 0 8px 4px rgba(64, 158, 255, 0.15);
        background-color: #b3d8ff;
    }
    100% {
        box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
        background-color: #e6f0fa;
    }
}

.item-checkable:active {
    animation: itemCheckableClick 0.3s;
}
</style>
