<template>
    <div style="display: flex; flex-direction: column; height: 100%">
        <Feedback></Feedback>
        <el-page-header icon="" style="margin: 10px 30px" title="Worder">
            <template #content>
                <div class="flex center-main">您好，尊贵的用户</div>
            </template>
            <template #extra>
                <el-form-item label="当前词书：" style="margin-bottom: 0">
                    <el-select
                        v-model="bookSelect"
                        placeholder="Select"
                        style="width: 240px"
                        @change="bookChange"
                    >
                        <el-option
                            v-for="item in dataStore.words"
                            :key="item.name"
                            :label="item.name"
                            :value="item.name"
                        />
                    </el-select>
                </el-form-item>
            </template>
        </el-page-header>
        <el-splitter>
            <el-splitter-panel v-if="!route.path.startsWith('/sign')" :resizable="false" size="20%">
                <NavBar />
            </el-splitter-panel>
            <el-splitter-panel>
                <router-view v-slot="{ Component }">
                    <keep-alive>
                        <component :is="Component" />
                    </keep-alive>
                </router-view>
            </el-splitter-panel>
        </el-splitter>
    </div>
</template>

<script setup lang="ts">
import NavBar from '@/component/NavBar.vue';
import { RouterView, useRoute } from 'vue-router';
import { ElSplitter, ElSplitterPanel } from 'element-plus';
import router from './router';
import { Setting, SynForm, Word, WordBook, WordMeaning, WordMeaningSet } from '@/data/modal';
import { TypeJson } from '@/utils/TypeJson';
import { useData } from './data/data';
import Feedback from '@/utils/Feedback.vue';
import { ref } from 'vue';

router.replace('/');

TypeJson.register(Word, -1, '');
TypeJson.register(WordMeaning, '');
TypeJson.register(WordMeaningSet);
TypeJson.register(WordBook, '', []);
TypeJson.register(SynForm, '');
TypeJson.register(Setting);

const route = useRoute();
const dataStore = useData();
dataStore.init();

const bookSelect = ref(dataStore.setting.nowWordBookName);

function bookChange(name: string) {
    dataStore.setting.nowWordBookName = name;
    location.reload();
}
</script>

<style scoped></style>
