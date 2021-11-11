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
    lessHeader
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
    return math.multiply(math.subtract(math.exp(math.divide(r, 100)), 1), 100);
}

function lessHeader(matrix) {
    let mtx = matrix.slice(0);
    mtx.shift();
    return mtx;
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