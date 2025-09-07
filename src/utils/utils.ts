import API from '@/utils/api';
import type { ReviewInfo } from '@/data/modal.ts';

function toFullSrc(filename: string): string {
    if (API.getEnvMode() == 'release')
        return new URL(`file://${(API.getProjectRoot() + '/dist' + filename).replace(/\\/g, '/')}`)
            .href;
    return filename;
}

/**
 * 计算单词的“熟记强度”（非负实数）
 * 说明：
 *  - 更大的值表示记得越牢。
 *  - 不强烈惩罚历史错误次数；重点关注 reviewInfo.lastWrong 是否在 reviewInfo.lastCorrect 之后（即错误尚未被纠正）以及该错误距今是否很近。
 */
function calcProficiency(reviewInfo: ReviewInfo, now: Date = new Date()): number {
    const msPerDay = 1000 * 60 * 60 * 24;

    // --- Tunable constants (可以根据经验微调) ---
    const baseCorrectWeight = 5; // 每次正确带来的基础增益（较温和）
    const totalWrongWeight = 1; // 历史错误的总体轻微影响（弱于正确的权重）
    const memoryLambdaDays = 14; // 遗忘时间常数（影响基准随时间衰减）
    const recentWrongTauDays = 7; // 若错误未纠正，错误惩罚随时间衰减的速度（越小惩罚越集中在近期）
    const recentWrongMaxPenalty = 0.85; // 最近且未纠正的最大惩罚比例（0.85 表示可能把强度乘到 ~0.15）
    const maxCorrectionBoost = 0.45; // 当错误被纠正且纠正很近时的最多加成

    // --- 基础强度（由正确次数、历史错误次数决定，确保非负） ---
    let base =
        1 +
        baseCorrectWeight * reviewInfo.rightReviewCount -
        totalWrongWeight * reviewInfo.wrongReviewCount;
    if (base < 0.05) base = 0.05; // 保底，避免被完全压为0

    // --- 基准时间：优先使用最后一次正确复习的时间，否则使用第一次学习时间 ---
    const referenceTime =
        reviewInfo.lastCorrect && !isNaN(reviewInfo.lastCorrect.getTime())
            ? reviewInfo.lastCorrect
            : reviewInfo.firstLearned;
    const deltaRefDays = Math.max(0, (now.getTime() - referenceTime.getTime()) / msPerDay);

    // 基于时间的遗忘衰减（越久越低）
    const decay = Math.exp(-deltaRefDays / memoryLambdaDays);

    let strength = base * decay;

    // --- 考虑最近一次错误 ---
    if (reviewInfo.lastWrong && !isNaN(reviewInfo.lastWrong.getTime())) {
        const deltaWrongDays = Math.max(
            0,
            (now.getTime() - reviewInfo.lastWrong.getTime()) / msPerDay
        );

        // 情况 A：错误尚未被后续正确复习（reviewInfo.lastWrong 在 reviewInfo.lastCorrect 之后，或根本没有 reviewInfo.lastCorrect）
        const wrongAfterlastCorrect =
            !reviewInfo.lastCorrect ||
            reviewInfo.lastWrong.getTime() > reviewInfo.lastCorrect.getTime();

        if (wrongAfterlastCorrect) {
            // recentWrongPenalty 在 (0, recentWrongMaxPenalty]，最近的错误惩罚最大，
            // 随着时间以 recentWrongTauDays 衰减（错误越久远惩罚越小）
            const penaltyFactor =
                recentWrongMaxPenalty * Math.exp(-deltaWrongDays / recentWrongTauDays);
            // 将强度乘以 (1 - penaltyFactor)：最近未纠正错误会把强度大幅拉低
            strength = strength * Math.max(0, 1 - penaltyFactor);
        } else {
            // 情况 B：错误已被后续正确纠正（reviewInfo.lastCorrect 在 reviewInfo.lastWrong 之后）
            // 这意味着用户纠正了错误。对熟练度给以“修复性”加成（与纠正的时间相关）
            const deltaSinceCorrectionDays = Math.max(
                0,
                (now.getTime() - reviewInfo.lastCorrect!.getTime()) / msPerDay
            );
            // boost 在 (0, maxCorrectionBoost], 纠正越近加成越明显
            const correctionBoost = Math.min(
                maxCorrectionBoost,
                0.25 * Math.exp(-deltaSinceCorrectionDays / memoryLambdaDays) +
                    0.05 * Math.log(1 + reviewInfo.rightReviewCount)
            );
            strength = strength * (1 + correctionBoost);
        }
    }

    // 最终下界
    if (!isFinite(strength) || strength < 0) strength = 0;
    return Math.round(strength * 1000) / 1000;
}

/**
 * 根据两个日期的差异，返回时间距离等级
 * @param nowDate 当前时间
 * @param calcDate 需要比较的时间
 * @returns "Today" | "Yesterday" | "ThreeDays" | "ThisWeek" | "ThisMonth" | "Oldest"
 * - "Today"：当天
 * - "Yesterday"：昨天
 * - "ThreeDays"：3天内
 * - "ThisWeek"：7天内
 * - "ThisMonth"：30天内
 * - "Oldest"：更早
 */
function calcTimeDiffLevel(
    nowDate: Date,
    calcDate: Date
): 'Today' | 'Yesterday' | 'ThreeDays' | 'ThisWeek' | 'ThisMonth' | 'Oldest';
/**
 * 根据日期和当前时间的差异，返回时间距离等级
 * @param calcDate 需要比较的时间
 * @returns "Today" | "Yesterday" | "ThreeDays" | "ThisWeek" | "ThisMonth" | "Oldest"
 * - "Today"：当天
 * - "Yesterday"：昨天
 * - "ThreeDays"：3天内
 * - "ThisWeek"：7天内
 * - "ThisMonth"：30天内
 * - "Oldest"：更早
 */
function calcTimeDiffLevel(
    calcDate: Date
): 'Today' | 'Yesterday' | 'ThreeDays' | 'ThisWeek' | 'ThisMonth' | 'Oldest';
function calcTimeDiffLevel(
    nowDate: Date,
    calcDate?: Date
): 'Today' | 'Yesterday' | 'ThreeDays' | 'ThisWeek' | 'ThisMonth' | 'Oldest' {
    if (!calcDate) {
        calcDate = nowDate;
        nowDate = new Date();
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    // 只比较日期部分
    const nowDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const calcDay = new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate());
    const diffDays = Math.floor((nowDay.getTime() - calcDay.getTime()) / msPerDay);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 3) return 'ThreeDays';
    if (diffDays <= 7) return 'ThisWeek';
    if (diffDays <= 30) return 'ThisMonth';
    return 'Oldest';
}

declare global {
    interface String {
        /**
         * 如果 condition 成立，返回原值，否则返回 ""
         * @param condition 判断条件
         */
        if(condition: boolean): string;
        /**
         * 如果所有前置 {@link if} 不成立，则进行此函数。如果 condition 成立，返回 value，否则返回 ""
         *
         * 常用于 {@link if} 和 {@link elif} 函数后，且不带有 elseValue 参数
         * @param condition 判断条件
         * @param value condition 成立时的返回值
         * @example
         * "a>1"
         * .if(a>1) // 在 a > 1 时返回 "a>1"
         * .elif(a>2, "a>2") // 在 1 >= a > 2 时返回 "a>2"
         */
        elif(condition: boolean, value: string): string;
        /**
         * 如果所有前置 {@link if} 和 {@link elif} 不成立，返回 value，否则返回前置 if 或 elif 规定的值
         *
         * 常用于 {@link if} 和 {@link elif} 函数后，且该 if 函数仅有 1 个参数
         * @param value 前置条件都不成立时地返回值时的返回值
         * @example
         * "a>1"
         * .if(a>1) // 在 a > 1 时返回 "a>1"
         * .elif(a>2, "a>2") // 在 1 >= a > 2 时返回 "a>2"
         * .else("a>=2") // 否则返回 "a>=2"
         */
        else(value: string): string;
    }
}
String.prototype.if = function (condition: boolean): string {
    if (condition) return this.toString();
    return '';
};
String.prototype.elif = function (condition: boolean, value: string = ''): string {
    if (this !== '') return this.toString();
    if (condition) return value;
    return '';
};
String.prototype.else = function (value: string): string {
    if (this !== '') return this.toString();
    return value;
};

export { toFullSrc, calcProficiency, calcTimeDiffLevel };
