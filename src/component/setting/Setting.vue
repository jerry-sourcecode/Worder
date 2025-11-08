<template>
    <div style="padding: 0 25px 25px">
        <el-form @submit.prevent>
            <el-tabs model-value="user">
                <el-tab-pane label="用户" name="user">
                    <p class="desc">欢迎您，尊贵的用户</p>
                    <el-button type="danger" @click="onClearDataBtnClick">删除所有数据</el-button>
                </el-tab-pane>
                <el-tab-pane label="词书" name="book">
                    <el-form-item label="拥有的词书">
                        <List
                            :source="dataStore.words"
                            :stringToData="wordBookListStringToData"
                            :dataToString="(d) => d.name"
                            :allow-rename="
                                (id) =>
                                    dataStore.words[id].name != dataStore.setting.nowWordBookName
                            "
                            v-slot="{ data }"
                            @before-delete="onBookBeforeDelete"
                        >
                            <p>{{ data.name }}</p>
                        </List>
                    </el-form-item>
                </el-tab-pane>
                <el-tab-pane label="学习和复习" name="check">
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
                    <el-form-item label="默认注释">
                        <el-input
                            v-model="dataStore.setting.defaultAnnotations"
                            type="textarea"
                            :autosize="{ minRows: 2 }"
                        />
                    </el-form-item>
                </el-tab-pane>
                <el-tab-pane label="词性" name="pos">
                    <el-form-item label="可选词性" style="display: flex">
                        <div style="display: flex; flex-direction: column; width: 100%">
                            <List
                                :source="dataStore.POS"
                                v-slot="{ data }"
                                :allow-delete="(id) => id != 0"
                            >
                                <em>{{ data }}</em> .
                            </List>
                        </div>
                    </el-form-item>
                </el-tab-pane>
                <el-tab-pane label="AI" name="AI">
                    <p class="desc">
                        允许使用<a href="https://openrouter.ai/" target="_blank">OpenRouter</a
                        >作为提供智能模型的 API 平台。
                    </p>
                    <el-form-item label="启用AI">
                        <el-switch
                            v-model="dataStore.setting.AISetting.useAi"
                            active-color="#13ce66"
                            active-text="开启"
                            inactive-color="#ff4949"
                            inactive-text="关闭"
                        />
                    </el-form-item>
                    <el-form-item label="API密钥">
                        <el-input
                            v-model="dataStore.setting.AISetting.apiKey"
                            :disabled="!dataStore.setting.AISetting.useAi"
                        />
                    </el-form-item>
                    <el-form-item label="模型">
                        <el-input
                            v-model="dataStore.setting.AISetting.modal"
                            :disabled="!dataStore.setting.AISetting.useAi"
                        />
                    </el-form-item>
                    <el-form-item label="AI翻译：目标语言">
                        <el-input
                            v-model="dataStore.setting.AISetting.lang"
                            :disabled="!dataStore.setting.AISetting.useAi"
                        />
                    </el-form-item>
                </el-tab-pane>
            </el-tabs>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { useData } from '@/data/data.ts';
import { ElForm, ElNotification, ElTabs } from 'element-plus';
import API from '@/utils/api.ts';
import List from '@/component/List.vue';
import { WordBook } from '@/data/modal.ts';
import { useEmitter } from '@/utils/emitter.ts';

const dataStore = useData();

function onClearDataBtnClick() {
    API.clearData();
    location.reload();
}

const emitter = useEmitter();

function onBookBeforeDelete(data: WordBook, returnFn: (v: boolean) => void) {
    if (data.name === dataStore.setting.nowWordBookName) {
        ElNotification({
            title: '删除失败',
            type: 'error',
            message: `无法删除正在使用的词书。`,
        });
        returnFn(false);
    } else
        emitter
            .emit(
                'dialog',
                '确认',
                `在${data.name}中发现${data.words.filter((v) => v).length}个单词，确定要全部删除吗？此操作无法撤回。`,
                [
                    {
                        msg: '确认',
                        id: '0',
                        emphasize: false,
                    },
                    {
                        msg: '取消',
                        id: '1',
                        emphasize: true,
                    },
                ]
            )
            .then((res) => {
                if (res == '0') returnFn(true);
                else returnFn(false);
            })
            .catch(() => {
                returnFn(false);
            });
}

function wordBookListStringToData(string: string, data: WordBook) {
    return new WordBook(string, data?.words ?? []);
}
</script>

<style scoped>
p.desc {
    margin: 5px 10px 10px 0;
}
</style>
