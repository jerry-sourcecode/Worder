type BtnType = {
    /**
     * 按钮信息
     */
    msg: string;
    /**
     * 是否强调
     */
    emphasize: boolean;
    /**
     * 按钮id
     */
    id: string;
};

type DialogMsgOptionType = {
    closeOnClickModel?: boolean,
    showClose?: boolean
}
export type { BtnType, DialogMsgOptionType };