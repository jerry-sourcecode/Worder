<template>
    <div style="margin: 0 10px 10px 20px" class="flex">
        <div>
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
            <el-switch
                v-model="dataStore.setting.sort.isRev"
                active-text="倒序"
                inactive-text="顺序"
            />
        </div>
        <div style="margin-left: auto; margin-right: 20px">
            <el-input
                v-model="searchText"
                style="width: 300px"
                placeholder="搜索单词/词义"
                :prefix-icon="Search"
            />
        </div>
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
                <div v-html="toHtml(item?.note)" />
            </div>
            <el-tooltip content="删除" effect="dark" placement="left">
                <el-icon
                    v-if="currentHover === item?.id"
                    size="30px"
                    @click="dataStore.rmWordsById(item.id)"
                    ><DeleteFilled
                /></el-icon>
            </el-tooltip>
            <el-icon v-if="currentHover !== item.id" size="30px">
                <el-image :src="getImg(item?.id)" />
            </el-icon>
        </div>
    </el-card>
    <el-empty v-if="dataStore.availableWords.length === 0" description="还没有单词，快去学习吧" />
</template>

<script setup lang="ts">
import { useData } from '@/data/data.ts';
import { computed, ref } from 'vue';
import { DeleteFilled, Search } from '@element-plus/icons-vue';
import { getWordPriority, toHtml } from '@/utils/utils.ts';
import { ReviewMode, SortBy } from '@/data/modal.ts';
import { TypeJson } from '@/utils/TypeJson.ts';
import { StringSearcher } from '@/utils/KMP.ts';
import L1Img from '@/assets/image/L1.png';
import L2Img from '@/assets/image/L2.png';
import L3Img from '@/assets/image/L3.png';

const dataStore = useData();

const currentHover = ref<string | null>(null);

function calLevel(id: string, by: ReviewMode) {
    const prio = Math.min(
        by & ReviewMode.ByWord
            ? getWordPriority(dataStore.getWordsById(id)!, ReviewMode.ByWord)
            : Infinity,
        by & ReviewMode.ByMeaning
            ? getWordPriority(dataStore.getWordsById(id)!, ReviewMode.ByMeaning)
            : Infinity
    );
    if (prio >= 1 && prio <= 19) return 1;
    if (prio >= 20 && prio <= 39) return 2;
    return 3;
}

/**
 * 获取允许的复习模式
 * @return {ReviewMode} 允许的复习模式，可能是按单词或按意思复习，或两者的组合
 */
function getAllowReviewMode(): ReviewMode {
    let rm = 0;
    if (dataStore.setting.reviewContent.byWord) {
        rm |= ReviewMode.ByWord;
    }
    if (dataStore.setting.reviewContent.byMeaning) rm |= ReviewMode.ByMeaning;
    return rm as ReviewMode;
}

const sortedWords = computed(() => {
    const stringComp = new StringSearcher(searchText.value);
    let sorted = TypeJson.copy(dataStore.availableWords);
    sorted.sort((a, b) => {
        let res = 0;
        switch (dataStore.setting.sort.sortBy) {
            case SortBy.Priority:
                res = calLevel(a?.id, getAllowReviewMode()) - calLevel(b?.id, getAllowReviewMode());
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

    if (searchText.value != '')
        sorted = sorted.filter((v) => {
            if (stringComp.check(v?.text)) return true;
            for (let i = 0; i < v?.meaningSet.length; i++) {
                for (let j = 0; j < v?.meaningSet[i].meaning.length; j++) {
                    if (stringComp.check(v?.meaningSet[i].meaning[j].text)) return true;
                }
            }
            return false;
        });
    return sorted;
});

const searchText = ref('');

function getImg(id: string) {
    switch (calLevel(id, getAllowReviewMode())) {
        case 1:
            return L1Img;
        case 2:
            return L2Img;
        case 3:
            return L3Img;
        default:
            return L3Img;
    }
}
</script>

<style scoped>
.word {
    font-size: larger;
    font-weight: bold;
    margin-bottom: 7px;
}
</style>
