/* global math */

export {indexOf, allIndices, getColAsArr, getRows, insert, contToSimp};

function indexOf(array, vals) {
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

function allIndices(array, val) {
    let indices = [];
    for(let i = 0; i < array.length; i++)
        if (array[i] === val)
            indices.push(i);
    return indices;
}

//return column of matrix as one dimentional array
function getColAsArr(matrix, indexOfCol) {
    let c = math.column(matrix, indexOfCol);
    if (matrix.length > 1) {
        c = math.transpose(c)[0];
    } else {
        c = [c];
    }
    return c;
}

function getRows(matrix, indicesOfRows) {
    let n = math.size(matrix)[1];
    return math.subset(matrix, math.index(indicesOfRows, math.range(0, n)));
}

//insert submatrix of first matrix into submatrix of second matrix
function insert(matrixFrom, matrixTo, indicesFrom, indicesTo) {
    let matrixToInsert = math.subset(matrixFrom, indicesFrom);
    return math.subset(matrixTo, indicesTo, matrixToInsert);
}

function contToSimp(r) {
    return math.multiply(math.subtract(math.exp(math.divide(r, 100)), 1), 100);
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