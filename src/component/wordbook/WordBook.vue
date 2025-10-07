<template>
    <div style="margin: 0 10px 10px 20px">
        排序方式：
        <el-select
            v-model="dataStore.setting.sort.sortBy"
            placeholder="排序方式"
            style="width: 140px; margin-right: 10px"
        >
            <el-option label="创建时间" :value="SortBy.CreateTime" />
            <el-option label="熟练度" :value="SortBy.Priority" />
            <el-option label="单词字典序" :value="SortBy.Dictionary" />
        </el-select>
        <el-switch v-model="dataStore.setting.sort.isRev" active-text="倒序" inactive-text="顺序" />
    </div>
    <el-card
        v-for="item in sortedWords"
        style="margin: 20px"
        @mouseleave="currentHover = null"
        @mouseover="currentHover = item?.id"
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
                <el-icon
                    v-if="currentHover === item?.id"
                    size="30px"
                    @click="dataStore.rmWords(item.id)"
                    ><DeleteFilled
                /></el-icon>
            </el-tooltip>
            <el-icon v-if="currentHover !== item.id" size="30px">
                <el-image :src="`/image/L${calLevel(item.id)}.png`" />
            </el-icon>
        </div>
    </el-card>
    <el-empty v-if="dataStore.availableWords.length === 0" description="还没有单词，快去学习吧" />
</template>

<script setup lang="ts">
import { useData } from '@/data/data.ts';
import { computed, ref } from 'vue';
import { DeleteFilled } from '@element-plus/icons-vue';
import { getWordPriority } from '@/utils/utils.ts';
import { ReviewMode, SortBy } from '@/data/modal.ts';
import { TypeJson } from '@/utils/TypeJson.ts';

const dataStore = useData();

const currentHover = ref<number | null>(null);

function calLevel(id: number) {
    const prio = Math.max(
        getWordPriority(dataStore.getWords(id)!, ReviewMode.ByWord),
        getWordPriority(dataStore.getWords(id)!, ReviewMode.ByMeaning)
    );
    if (prio >= 1 && prio <= 19) return 1;
    if (prio >= 20 && prio <= 39) return 2;
    return 3;
}

const sortedWords = computed(() => {
    const sorted = TypeJson.copy(dataStore.availableWords);
    sorted.sort((a, b) => {
        let res = 0;
        switch (dataStore.setting.sort.sortBy) {
            case SortBy.Priority:
                res = calLevel(a?.id) - calLevel(b?.id);
                break;
            case SortBy.Dictionary:
                res = a?.text < b?.text ? -1 : 1;
                break;
            case SortBy.CreateTime:
                res = a?.createTime.getTime() - b?.createTime.getTime();
                break;
        }
        if (dataStore.setting.sort.isRev) return -res;
        return res;
    });
    return sorted;
});
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
