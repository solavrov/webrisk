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
    calcCov,
    arrToMtx,
    makeHistogramData,
    getPortErForTimes,
    getQForTimes,
    makePortPath
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

function delCross(matrix, indexToDel) {
    let mtx = matrix.slice(0);
    if (indexToDel >= 0) {
        mtx.splice(indexToDel, 1);
        mtx = math.transpose(mtx);
        mtx.splice(indexToDel, 1);
        mtx = math.transpose(mtx);
    }
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

function runif2(n) {
  let m = 134456;
  let a = 8121;
  let c = 28411;
  let r = 59949; //seed
  let x = [];
  let i = 0;
  while (i < n) {
    if (r > 0) {
        x.push(r);
        i++;
    }
    r = (a * r + c) % m;
  }
  return (math.divide(x, m));
}

function rnorm(n, isSeedRandom=true) {
    var u, v;
    if (isSeedRandom) {
        u = runif(n);
        v = runif(n);
    } else {
        let r = runif2(2*n);
        u = r.slice(0, n);
        v = r.slice(n, 2*n);
    }
    let x = math.sqrt(math.multiply(-2, math.log(u)));
    let y = math.cos(math.multiply(2 * Math.PI, v));
    return math.dotMultiply(x, y);
}

function rnormMatrix(nrows, ncols, isSeedRandom=true) {
    let r = rnorm(nrows * ncols, isSeedRandom);
    let mtx = [];
    for (let j = 0; j < nrows; j++) mtx.push(r.slice(j * ncols, (j+1) * ncols));
    return mtx;
}

// take array or number and return matrix with ncols columns of that array or number
function arrToMtx(array, ncols) {
    let mxt = [];
    if(Array.isArray(array)) {
        var arr = array.slice(0);
    } else {
        var arr = [array];
    }
    for (let i = 0; i < ncols; i++) mxt.push(arr);
    return math.transpose(mxt);
}

function makeSample(covcc, n, isSeedRandom=true) {
    let indexOfZero = math.diag(covcc).indexOf(0);
    let covcc2 = delCross(covcc, indexOfZero);
    let omega = chol(covcc2);
    let x = rnormMatrix(covcc2.length, n, isSeedRandom);
    x = math.multiply(omega, x);    
    x.splice(indexOfZero, 0, math.zeros([1, n])[0]);
    return math.exp(math.divide(x, 100));
}

function calcCov(x, y) {
    let mx = math.mean(x);
    let my = math.mean(y);
    let c = 0;
    for (let i = 0; i < x.length; i++) c += (x[i] - mx) * (y[i] - my);
    return (c / (x.length - 1));
}

function makeHistogramData(array, min_val, max_val, step) {
    function color(x) {
        if (x < 0) return "fill-color: red";
        else return "fill-color: green";
    }
    let b = [];
    for (let v = min_val; v <= max_val; v += step) b.push(v);
    let arr = array.slice(0);
    let hist = [];
    for (let j = 0; j < b.length; j++) {
        let n = arr.filter(e => e < b[j]).length;
        let row;
        if (j === 0) row = [b[0] - step, n, n + " outcomes < " + b[0], color(b[0])];
        else row = [b[j - 1], n, n + " outcomes in [" + b[j - 1] + ", " + b[j] + ")", color(b[j - 1])];
        hist.push(row);
        arr = arr.filter(e => e >= b[j]);
    }
    hist.push([b[b.length - 1], arr.length, arr.length + " outcomes >= " + b[b.length - 1], color(b[b.length - 1])]);
    return hist;
}

function getPortErForTimes(erArrBase, wArr, tBase, timeArr) {
    if (!Array.isArray(erArrBase)) erArrBase = [erArrBase];
    if (!Array.isArray(wArr)) wArr = [wArr];
    let erMtx = [];
    timeArr.forEach(() => {erMtx.push(erArrBase);});
    erMtx = math.transpose(erMtx);
    let timeMtx = [];
    let timeArr2 = math.divide(timeArr, tBase);
    erArrBase.forEach(() => {timeMtx.push(timeArr2);});
    let r = math.add(math.multiply([wArr], math.dotPow(math.add(1, erMtx), timeMtx)), -1);
    r = math.multiply(r[0], 100);
    return r;
}

function getQForTimes(qccBase, erccBase, tBase, timeArr) {
    let a = erccBase / tBase;
    let b = (qccBase - erccBase) / math.sqrt(tBase);
    let c = math.add(math.multiply(a, timeArr), math.multiply(b, math.sqrt(timeArr)));
    return math.multiply(math.add(math.exp(c), -1), 100);
}

function cumsumrow(row) {
    let row2 = [0];
    for (let i = 0; i < row.length; i++) {
        row2.push(row2[i] + row[i]);
    }
    return row2;
}


function cumsum(mtx) {
    let mtx2 = [];
    for (let i = 0; i < mtx.length; i++) {
        mtx2.push(cumsumrow(mtx[i]));
    }
    return mtx2;
}

function makePath(erccArrBase, covccBase, tBase, tEnd) {
    if (!Array.isArray(erccArrBase)) erccArrBase = [erccArrBase];
    if (!Array.isArray(covccBase)) covccBase = [[covccBase]];
    let indexOfZero = math.diag(covccBase).indexOf(0);
    let covccBase2 = math.divide(delCross(covccBase, indexOfZero), tBase);
    let dr;
    if (covccBase2.length > 0) {
        let omega = chol(covccBase2);
        let x = rnormMatrix(covccBase2.length, tEnd);
        x = math.multiply(omega, x);    
        if (indexOfZero >= 0) x.splice(indexOfZero, 0, math.zeros([1, tEnd])[0]);
        dr = math.add(math.divide(arrToMtx(erccArrBase, tEnd), tBase), x);
    } else {
        dr = math.divide(arrToMtx(erccArrBase, tEnd), tBase);
    }
    let r = math.add(math.exp(cumsum(dr)), -1);
    return math.multiply(r, 100);
}

function makePortPath(wArr, erccArrBase, covccBase, tBase, tEnd) {
    if (!Array.isArray(wArr)) wArr = [wArr];
    let path = makePath(erccArrBase, covccBase, tBase, tEnd);
    return math.multiply([wArr], path)[0];
}
