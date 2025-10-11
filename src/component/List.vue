<template>
    <div style="display: flex; flex-direction: column; width: 100%">
        <div
            v-for="(data, id) in source"
            :class="id == 0 ? `item-first` : ``"
            class="item"
            @mouseleave="currentHover = null"
            @mouseover="currentHover = id"
        >
            <p style="padding-left: 5px">
                <slot :data="data" v-if="isRenameId != id" />
                <InputLabel :ref="(el) => setGraphRef(el as any, id)" />
            </p>
            <div style="margin-left: auto">
                <el-tooltip content="删除" effect="dark" placement="left">
                    <el-icon
                        v-if="currentHover === id && allowDelete(id)"
                        size="22px"
                        style="margin-right: 15px"
                        @click="remove(data, id)"
                    >
                        <DeleteFilled />
                    </el-icon>
                </el-tooltip>
                <el-tooltip content="重命名" effect="dark" placement="top">
                    <el-icon
                        v-if="currentHover === id && allowRename(id)"
                        size="22px"
                        style="margin-right: 15px; margin-left: auto"
                        @click="rename(id)"
                    >
                        <Edit />
                    </el-icon>
                </el-tooltip>
            </div>
        </div>
        <div :class="isEditing ? `` : `item-checkable`" class="item item-last" @click="add">
            <Input ref="inputRef" placeholder="输入新的可选词性" @input-done="handleInputDone" />
            <p v-if="!isEditing" style="padding-left: 5px">增加一个新的可选词性</p>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 该组件用于显示一个列表，并允许用户添加和删除项目。
 * 使用方法：
 * 1. 通过 `source.value` 属性传递要显示的数据数组。
 * 2. 通过 `stringToData` 属性传递一个函数，将输入的字符串转换为数据对象（可选）。
 * 3. 通过插槽传递每个项目的显示内容。
 *
 * 示例：
 * <List :source.value="data" v-slot="{ data }">
 *   <em>{{ data }}</em> .
 * </List>
 */
import { DeleteFilled, Edit } from '@element-plus/icons-vue';
import Input from '@/component/InputLabel.vue';
import InputLabel from '@/component/InputLabel.vue';
import { ref, type Ref } from 'vue';

type InputLabelInstance = InstanceType<typeof InputLabel>;

// 定义 source 模型，用于接收外部传递的数据数组
const source = defineModel<Array<any>>('source');

// 定义 props，可以传入一个将字符串转换为数据对象的函数
const props = withDefaults(
    defineProps<{
        stringToData?: (string: string, baseData: any) => any;
        allowDelete?: (id: number) => boolean;
        dataToString?: (data: any) => string;
        allowRename?: (id: number) => boolean;
    }>(),
    {
        stringToData: (arg0: string) => arg0,
        dataToString: (data: any) => data,
        allowDelete: () => true,
        allowRename: () => true,
    }
);

// 当前鼠标悬停的项目索引
const currentHover: Ref<number | null> = ref(null);

// 是否处于编辑状态
const isEditing = ref(false);

// 输入框引用
const inputRef = ref<InstanceType<typeof Input> | null>(null);

// 添加新项目
function add() {
    if (isEditing.value) return;
    isEditing.value = true;
    inputRef.value?.display();
}

// 处理输入完成事件
function handleInputDone(value: string) {
    isEditing.value = false;
    if (value === '') return;
    source?.value!.push(props.stringToData(value, null));
}

const emit = defineEmits<{
    beforeDelete: [data: any, returnFn: (v: boolean) => void];
}>();

function remove(data: any, id: number) {
    emit('beforeDelete', data, (v) => {
        if (v) {
            source?.value!.splice(id, 1);
        }
    });
}

const inputLabelRefList: Ref<(InputLabelInstance | null)[]> = ref([]);
const isRenameId = ref(-1);
function setGraphRef(el: InputLabelInstance, id: number) {
    while (inputLabelRefList.value.length <= id) {
        inputLabelRefList.value.push(null);
    }
    inputLabelRefList.value[id] = el;
}
function rename(id: number) {
    isRenameId.value = id;
    inputLabelRefList.value[id]?.display(props.dataToString(source.value![id])).then((res) => {
        source.value![id] = props.stringToData(res, source.value![id]);
        isRenameId.value = -1;
    });
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
