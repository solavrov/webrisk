
import {Matrix} from "./Matrix.js";
import {calcData} from "./data.js";

export {setCurPick};

function setCurPick(glob) {
    let refreshTableCur = function(table, icols) {
            if (table.matrix.length > 1) {
                let matrix = new Matrix(table.matrix);
                let indices = glob.data.tickers.fiof(matrix.decap().cols(0));
                let source = glob.data.assetMatrices[glob.cur].rows(indices).cols([2, 3, 4]); //!!!
                matrix = matrix.plugc(source, icols);
                table.matrix = matrix.arr;
                table.syncTableWithMatrix();
            }
        };
    glob.html.curPick.forEach((elem) => elem.addEventListener("click", function(event) { //!!!
        glob.cur = event.target.value;
        refreshTableCur(glob.table.stockUs, [2, 3, 4]);
        refreshTableCur(glob.table.stockRu, [2, 3, 4]);
        refreshTableCur(glob.table.bond, [2, 3, 4]);
        refreshTableCur(glob.table.commodity, [2, 3, 4]);
        refreshTableCur(glob.table.etf, [2, 3, 4]);
        refreshTableCur(glob.table.crypto, [2, 3, 4]);
        refreshTableCur(glob.table.port, [3, 4, 5]);
        glob.table.port.refreshSummary();
    }));
}

//function setHorPick(glob) {
//    glob.html.horPick.forEach((elem) => elem.addEventListener("click", function(event) {
//        glob.hor = Number(event.target.value);
//        calcData(glob);
//        
//    }));
//}
