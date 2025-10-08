/**
 * 高效的字符串搜索类
 * 使用 KMP 算法实现，时间复杂度：O(n+m)
 */
class StringSearcher {
    pattern: string;
    private lps: number[]; // 最长公共前后缀数组

    /**
     * 构造函数
     * @param pattern 搜索的模式字符串
     */
    constructor(pattern: string) {
        this.pattern = pattern;
        this.lps = this.computeLPSArray(pattern);
    }

    /**
     * 计算最长公共前后缀数组 (LPS)
     * @param pattern 模式字符串
     * @returns LPS 数组
     */
    private computeLPSArray(pattern: string): number[] {
        const lps: number[] = new Array(pattern.length).fill(0);
        let length = 0; // 当前最长公共前后缀的长度
        let i = 1;

        while (i < pattern.length) {
            if (pattern[i] === pattern[length]) {
                length++;
                lps[i] = length;
                i++;
            } else {
                if (length !== 0) {
                    length = lps[length - 1];
                } else {
                    lps[i] = 0;
                    i++;
                }
            }
        }
        return lps;
    }

    /**
     * 在文本中搜索模式字符串
     * @param text 要搜索的文本
     * @returns 如果找到模式字符串返回 true，否则返回 false
     * 时间复杂度：O(n+m)
     */
    check(text: string): boolean {
        if (this.pattern.length === 0) return true;
        if (text.length < this.pattern.length) return false;

        let i = 0; // text 的索引
        let j = 0; // pattern 的索引

        while (i < text.length) {
            if (this.pattern[j] === text[i]) {
                i++;
                j++;
            }

            if (j === this.pattern.length) {
                return true; // 找到匹配
            } else if (i < text.length && this.pattern[j] !== text[i]) {
                if (j !== 0) {
                    j = this.lps[j - 1];
                } else {
                    i++;
                }
            }
        }

        return false; // 未找到匹配
    }

    /**
     * 在文本中搜索所有出现的位置
     * @param text 要搜索的文本
     * @returns 所有匹配开始位置的数组
     */
    findAll(text: string): number[] {
        const positions: number[] = [];
        if (this.pattern.length === 0 || text.length < this.pattern.length) {
            return positions;
        }

        let i = 0; // text 的索引
        let j = 0; // pattern 的索引

        while (i < text.length) {
            if (this.pattern[j] === text[i]) {
                i++;
                j++;
            }

            if (j === this.pattern.length) {
                positions.push(i - j); // 记录匹配位置
                j = this.lps[j - 1];
            } else if (i < text.length && this.pattern[j] !== text[i]) {
                if (j !== 0) {
                    j = this.lps[j - 1];
                } else {
                    i++;
                }
            }
        }

        return positions;
    }

    /**
     * 获取第一个匹配的位置
     * @param text 要搜索的文本
     * @returns 第一个匹配的位置，未找到返回 -1
     */
    findFirst(text: string): number {
        const positions = this.findAll(text);
        return positions.length > 0 ? positions[0] : -1;
    }

    /**
     * 忽略大小写的搜索
     * @param text 要搜索的文本
     * @returns 如果找到模式字符串返回 true，否则返回 false
     */
    checkIgnoreCase(text: string): boolean {
        const patternLower = this.pattern.toLowerCase();
        const textLower = text.toLowerCase();

        // 为小写模式重新计算 LPS
        const tempSearcher = new StringSearcher(patternLower);
        return tempSearcher.check(textLower);
    }

    /**
     * 获取模式字符串
     * @returns 模式字符串
     */
    getPattern(): string {
        return this.pattern;
    }
}

export { StringSearcher };