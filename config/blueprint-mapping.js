// Blueprint ID → マスター商品IDマッピング

const BLUEPRINT_TO_MASTER = {
    6: '68dffaef951b5797930ad3fa',      // Gildan 5000
    26: '68dffca5f6f3f5439609a446',     // Gildan 980
    36: '68e00767f405aeee2807feaa',     // Gildan 2000
    145: '68dffe1ff1fe6779bb0cdfb1',    // Gildan 64000
    157: '68dfff12ccd7b22ae206682a',    // Gildan 5000B
    80: '68e0000eb4d1554d3906a4bc',     // Gildan 2400
    49: '68e0050d0515f444220525d7',     // Gildan 18000
    77: '68e006307bbf5c83180c5b45',     // Gildan 18500

    // 既存のカスタムBlueprint（マスター自体なので再作成不要）
    706: null,   // カスタムTシャツマスター
    1296: null   // カスタムスウェットマスター
};

module.exports = {
    BLUEPRINT_TO_MASTER
};
