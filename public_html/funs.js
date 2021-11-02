/* global math */

export {indexOf, getCol, insert};

function indexOf(array, elements) {
    let indices = [];
    if (Array.isArray(elements)) {
        for (let e of elements) {
            indices.push(array.indexOf(e));
        }
    } else {
        indices.push(array.indexOf(elements));
    }
    return indices;
}

//return column of matrix as one dimentional array
function getCol(matrix, indexOfCol) {
    let c = math.column(matrix, indexOfCol);
    if (matrix.length > 1) {
        c = math.transpose(c)[0];
    } else {
        c = [c];
    }
    return c;
}

//insert submatrix of first matrix into submatrix of second matrix
function insert(matrixFrom, matrixTo, indicesFrom, indicesTo) {
    let matrixToInsert = math.subset(matrixFrom, indicesFrom);
    return math.subset(matrixTo, indicesTo, matrixToInsert);
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