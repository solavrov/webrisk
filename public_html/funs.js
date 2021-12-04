/* global math */

export {
    getIndices, 
    allIndices, 
    getRows, 
    getCols, 
    insert, 
    contToSimp,
    insertCols,
    getVals,
    colToArr,
    lessHeader,
    roundWeights,
    makeSample,
    calcCov
};

function getIndices(array, vals) {
    let indices = [];
    if (Array.isArray(vals)) {
        for (let v of vals) {
            indices.push(array.indexOf(v));
        }
    } else {
        indices.push(array.indexOf(vals));
    }
    return indices;
}

function getVals(array, indices) {
    let vals = [];
    indices.forEach(i => vals.push(array[i]));
    if (vals.length === 1) vals = vals[0];
    return vals;
}

function allIndices(array, val) {
    let indices = [];
    for(let i = 0; i < array.length; i++)
        if (array[i] === val)
            indices.push(i);
    return indices;
}

function colToArr(col) {
    if (Array.isArray(col)) {
        var a = math.transpose(col)[0];
    } else if (col === null) {
        var a = [];
    } else {
        var a = col;
    }
    return a;
}

function getRows(matrix, indicesOfRows) {
    let n = math.size(matrix)[1];
    return math.subset(matrix, math.index(indicesOfRows, math.range(0, n)));
}

function getCols(matrix, indicesOfCols, takeHeader=true) {
    let cols = null;
    if (takeHeader || matrix.length > 1) {
        let m = math.size(matrix)[0];
        let h = 1;
        if (takeHeader) h = 0;
        cols = math.subset(matrix, math.index(math.range(h, m), indicesOfCols));
    }
    return cols;
}

//insert submatrix of first matrix into submatrix of second matrix
function insert(matrixFrom, matrixTo, indicesFrom, indicesTo) {
    let matrixToInsert = math.subset(matrixFrom, indicesFrom);
    return math.subset(matrixTo, indicesTo, matrixToInsert);
}

function insertCols(matrix, cols, iTo) {
    if (Array.isArray(cols)) {
        var h = matrix.length - cols.length;
    } else {
        var h = matrix.length - 1;
    }
    return math.subset(matrix, math.index(math.range(h, matrix.length), iTo), cols);
}

function contToSimp(r) {
    r = math.divide(r, 100);
    return math.multiply(math.subtract(math.exp(r), 1), 100);
}

function simpToCont(r) {
    r = math.divide(r, 100);
    return math.multiply(math.log(math.add(1, r)), 100);
}

function lessHeader(matrix) {
    let mtx = matrix.slice(0);
    mtx.shift();
    return mtx;
}

//round weight making all w <= digit * 10^-pos equal zero
function roundWeights(w, pos=3, digit=1) {
    w = math.round(w, pos);
    for (let i = 0; i < w.length; i++) {
        w[i][0] *= (w[i][0] > math.pow(10, -pos) * digit);
    }
    let iMax = colToArr(w).indexOf(math.max(w));
    let s = math.sum(w);
    w[iMax][0] += (1 - s);
    w = math.round(w, pos);
    return w;
}

function chol(A) {
    let L = math.zeros([A.length, A.length]);
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j <= i; j++) {
            let s = 0;
            for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
            if (i === j) L[i][j] = math.sqrt(A[i][i] - s);
            else L[i][j] = (A[i][j] - s) / L[j][j];
        }
    }
    return L;
}

function delCross(symmetricMatrix, indexToDel) {
    let mtx = symmetricMatrix.slice(0);
    mtx.splice(indexToDel, 1);
    mtx = math.transpose(mtx);
    mtx.splice(indexToDel, 1);
    mtx = math.transpose(mtx);
    return mtx;
}

function runif(n) {
    let r = [];
    for (let i = 0; i < n; i++) {
        let x = 0;
        while(x === 0) x = Math.random();
        r.push(x);
    }
    return r;
}

function rnorm(n) {
    let u = runif(n);
    let v = runif(n);
    let x = math.sqrt(math.multiply(-2, math.log(u)));
    let y = math.cos(math.multiply(2 * Math.PI, v));
    return math.dotMultiply(x, y);
}

function rnormMatrix(nrows, ncols) {
    let mtx = [];
    for (let j = 0; j < nrows; j++) mtx.push(rnorm(ncols));
    return mtx;
}

function makeMtxFromArr(array, n) {
    let arr = array.slice(0);
    let mtx = [];
    for (let i = 0; i < n; i++) mtx.push(arr);
    return math.transpose(mtx);
}

function makeSample(covcc, ercc, n) {
    let indexOfZero = math.diag(covcc).indexOf(0);
    let rfr = math.add(math.zeros([1, n])[0], ercc[indexOfZero]);
    let covcc2 = delCross(covcc, indexOfZero);
    let ercc2 = ercc.slice(0);
    ercc2.splice(indexOfZero, 1);
    ercc2 = makeMtxFromArr(ercc2, n);
    let omega = chol(covcc2);
    let x = rnormMatrix(covcc2.length, n);
    let rcc = math.add(math.multiply(omega, x), ercc2);    
    rcc.splice(indexOfZero, 0, rfr);
    let r = math.multiply(math.subtract(math.exp(math.divide(rcc, 100)), 1), 100);
    return r;
}

function calcCov(x, y) {
    let mx = math.mean(x);
    let my = math.mean(y);
    let c = 0;
    for (let i = 0; i < x.length; i++) c += (x[i] - mx) * (y[i] - my);
    return (c / (x.length - 1));
}

//function getRowFromFB(rowSnapshot) {
//    let x = [];
//    rowSnapshot.forEach((item) => {
//            x.push(item.val());
//        }
//    );
//    return (x);
//}
//
//function getMatrixFromFB(matrixSnapshot) {
//    let m = [];
//    matrixSnapshot.forEach((rowSnapshot) => {
//            m.push(getRowFromFB(rowSnapshot));
//        }
//    );
//    return (m);
//}

// function removeItem(array, item) {
//     return (array.filter((e) => {return (e!==item);}));
// }
//
// function buildTable(matrix) {
//     let table = document.createElement("table");
//     table["border"] = 1;
//     let nRows = matrix.length;
//     let nCols = matrix[0].length;
//     for (let j = 0; j < nRows; j++) {
//         let row = table.insertRow(j);
//         for (let i = 0; i < nCols; i++) {
//             row.insertCell(i).innerHTML = matrix[j][i];
//         }
//     }
//     return (table);
// }