<script lang="ts" setup>
import { ref } from 'vue';
import type { BtnType, DialogMsgOptionType } from '@/type/index.ts';
import { useEmitter } from '@/utils/emitter.ts';
import { TypeJson } from '@/utils/TypeJson.ts';
import { Queue } from '@/utils/utils.ts';

class DialogMsg {
    title: string;
    message: string;
    btnList: BtnType[];
    res: (value: string) => void;
    rej: (reason: string) => void;
    option: DialogMsgOptionType;
    constructor(
        title: string,
        message: string,
        btnList: BtnType[],
        res: (value: string) => void,
        rej: (reason: string) => void,
        option: DialogMsgOptionType
    ) {
        this.title = title;
        this.message = message;
        this.btnList = TypeJson.copy(btnList);
        this.res = res;
        this.rej = rej;
        this.option = option;
    }
}

const emitter = useEmitter();

const dialogVisible = ref(false);

const dialogQueue = ref(new Queue<DialogMsg>());

const isCloseByUserBtn = ref(false);

emitter.on(
    'dialog',
    (title: string, message: string, btnList: BtnType[], option?: DialogMsgOptionType) => {
        const opt: DialogMsgOptionType = {
            closeOnClickModel: option?.closeOnClickModel ?? false,
            showClose: option?.showClose ?? true,
        };
        return new Promise((resolve, reject) => {
            dialogQueue.value.push(new DialogMsg(title, message, btnList, resolve, reject, opt));
            displayDialog();
        });
    }
);

function displayDialog() {
    if (dialogQueue.value.empty()) return;
    dialogVisible.value = true;
    isCloseByUserBtn.value = false;
}

function btnClick(id: string) {
    dialogVisible.value = false;
    isCloseByUserBtn.value = true;
    dialogQueue.value.front()?.res(id);
    dialogQueue.value.pop();
    setTimeout(() => {
        displayDialog();
    }, 200);
}

function onDialogClosed() {
    if (isCloseByUserBtn.value) return;
    dialogQueue.value.front()?.rej('By close botton.');
    dialogQueue.value.pop();
    setTimeout(() => {
        displayDialog();
    }, 200);
}
</script>

<template>
    <el-dialog
        v-model="dialogVisible"
        :close-on-click-modal="dialogQueue.front()?.option.closeOnClickModel"
        :show-close="dialogQueue.front()?.option.showClose"
        :title="dialogQueue.front()?.title"
        width="500"
        @closed="onDialogClosed"
    >
        <div v-html="dialogQueue.front()?.message"></div>
        <template #footer>
            <div class="dialog-footer">
                <el-button
                    v-for="item in dialogQueue.front()?.btnList"
                    :type="'primary'.if(item.emphasize).else('default')"
                    @click="btnClick(item.id)"
                >
                    {{ item.msg }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped></style>
