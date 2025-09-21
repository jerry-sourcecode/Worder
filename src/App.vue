<template>
    <el-splitter style="height: 100%">
        <el-splitter-panel :resizable="false" size="20%">
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
</template>

<script setup lang="ts">
import NavBar from '@/component/NavBar.vue';
import { RouterView } from 'vue-router';
import { ElSplitter, ElSplitterPanel } from 'element-plus';
import router from './router';
import { Setting, SynForm, Word, WordMeaning, WordMeaningSet } from '@/data/modal';
import TypeJson from '@/utils/TypeJson';
import { useData } from './data/data';

router.replace('/');

TypeJson.register(Word, -1, '');
TypeJson.register(WordMeaning, '');
TypeJson.register(WordMeaningSet);
TypeJson.register(SynForm, '');
TypeJson.register(Setting);

const dataStore = useData();
dataStore.init();
</script>

<style scoped></style>
