<template>
    <el-card
        v-for="(item, id) in dataStore.availableWords"
        style="margin: 10px"
        @mouseleave="currentHover = null"
        @mouseover="currentHover = id"
    >
        <div class="flex" style="align-items: center">
            <div style="flex: 1">
                <p class="word">{{ item.text }}</p>
                <div v-for="mn in item.meaningSet">
                    <p>
                        <em style="margin-right: 10px">{{ mn.POS }}.</em>
                        <span v-for="value in mn.meaning">{{ value.text }}；</span>
                    </p>
                </div>
                <div v-if="item?.synForm.length != 0">
                    同时写作：
                    <span v-for="form in item?.synForm">{{ form.word }}；</span>
                </div>
            </div>
            <el-tooltip content="删除" effect="dark" placement="left">
                <el-icon v-if="currentHover === id" size="30px" @click="dataStore.rmWords(item.id)"
                    ><DeleteFilled
                /></el-icon>
            </el-tooltip>
        </div>
    </el-card>
    <el-empty v-if="dataStore.availableWords.length === 0" description="还没有单词，快去学习吧" />
</template>

<script setup lang="ts">
import { useData } from '@/data/data.ts';
import { ref } from 'vue';
import { DeleteFilled } from '@element-plus/icons-vue';

const dataStore = useData();

const currentHover = ref<number | null>(null);
</script>

<style scoped>
.word {
    font-size: larger;
    font-weight: bold;
    margin-bottom: 7px;
}
</style>

<style>
.el-card__body {
    width: 100%;
}
</style>
