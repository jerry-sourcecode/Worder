import { createRouter, createWebHashHistory } from 'vue-router';

import WordBook from '@/component/wordbook/WordBook.vue';
import Setting from '@/component/setting/Setting.vue';
import Study from '@/component/study/Study.vue';
import Review from '@/component/review/Review.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            redirect: '/wordbook',
        },
        {
            path: '/wordbook',
            name: 'WordBook',
            component: WordBook,
            meta: { keepAlive: true },
        },
        {
            path: '/review',
            name: 'Review',
            component: Review,
            meta: { keepAlive: true },
        },
        {
            path: '/setting',
            name: 'Setting',
            component: Setting,
            meta: { keepAlive: true },
        },
        {
            path: '/study',
            name: 'Study',
            component: Study,
            meta: { keepAlive: true },
        },
    ],
});

export default router;
