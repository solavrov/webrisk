import {SideTable} from "./SideTable.js";

export {CentralTable};

class CentralTable extends SideTable {
    constructor(headerArray, cssClassTable, cssClassInput, aligns, caption="", actionSymbol="&#10006;", blankSymbol="&#9586;") {
        super(headerArray, "Center", cssClassTable, aligns, caption, actionSymbol, blankSymbol)
        this.sideTables = {};
        this.adapters = {};
        this.rowOwnerNames = [null];
        this.summarizer = null;
        this.recalculator = null;
        this.cssClassInput = cssClassInput;
        this.inputIndices = []; //indices of matrix count
        this.enterHandler = null;
    }

    link(tableObject, CenterToSideAdapter, SideToCenterAdapter) {
        this.sideTables[tableObject.name] = tableObject;
        this.adapters[tableObject.name] = CenterToSideAdapter;
        tableObject.centerTable = this;
        tableObject.adapter = SideToCenterAdapter;
    }

    syncTableWithMatrix() {
        for (let j = 1; j < this.matrix.length; j++) {
            for (let i = 0; i < this.matrix[j].length; i++) {
                if (this.inputIndices.includes(i)) {
                    this.table.rows[j].cells[i + 1].firstElementChild.value = this.matrix[j][i];
                } else {
                    this.table.rows[j].cells[i + 1].innerHTML = this.matrix[j][i];
                }
            }
        }
    }

    syncMatrixWithTable() {
        for (let j = 1; j < this.matrix.length; j++) {
            for (let i = 0; i < this.matrix[j].length; i++) {
                if (this.inputIndices.includes(i)) {
                    this.table.rows[j].cells[i + 1].firstElementChild.blur();
                    this.matrix[j][i] = Number(this.table.rows[j].cells[i + 1].firstElementChild.value);
                }
            }
        }
    }

    addSummary(summarizer) {
        this.summarizer = summarizer;
        let m = this.matrix.map((row) => [...row]);
        let sumRow = summarizer(m);
        let row = this.table.insertRow();
        let cell = row.insertCell(0);
        cell.innerHTML = "";
        for (let i = 0; i < sumRow.length; i++) {
            cell = row.insertCell(i + 1);
            cell.style.textAlign = this.aligns[i];
            cell.innerHTML = sumRow[i];
        }
    }

    refreshSummary() {
        if (this.summarizer !== null) {
            let m = this.matrix.map((row) => [...row]);
            let sumRow = this.summarizer(m);
            for (let i = 0; i < sumRow.length; i++) {
                this.table.rows[this.matrix.length].cells[i + 1].innerHTML = sumRow[i];
            }
        }
    }

    addRecalculator(recalculator) {
        this.recalculator = recalculator;
    }

    recalculate() {
        if (this.recalculator !== null) {
            let m = this.matrix.map((row) => [...row]);
            this.matrix = this.recalculator(m);
            this.syncTableWithMatrix();
        }
    }

    addInput(inputIndex) {
        if (!this.inputIndices.includes(inputIndex)) {
            this.inputIndices.push(inputIndex);
            let t = this;
            for (let j = 1; j < this.matrix.length; j++) {
                let input = document.createElement("input");
                let cell = this.table.rows[j].cells[inputIndex + 1];
                input.className = this.cssClassInput;
                input.maxLength = 7;
                input.size = 5;
                input.value = cell.innerHTML;
                cell.innerHTML = "";
                cell.appendChild(input);
                input.addEventListener("blur", function() {
                    t.refreshWithInput();
                });
            }
            if (this.enterHandler === null) {
                let handler = function(event) {
                    if (event["keyCode"] === 13) {
                        t.blurInput();
                    }
                };
                this.enterHandler = handler;
                document.addEventListener("keydown", handler);
            }
        }
    }

    removeInput(inputIndex, substCol=[]) {
        if (this.inputIndices.includes(inputIndex)) {
            for (let j = 1; j < this.matrix.length; j++) {
                let cell = this.table.rows[j].cells[inputIndex + 1];
                let v = cell.lastChild.value;
                cell.removeChild(cell.lastChild);
                if (substCol.length === this.matrix.length - 1) {
                    cell.innerHTML = substCol[j - 1];
                } else {
                    cell.innerHTML = v;
                }
            }
            this.inputIndices.splice(this.inputIndices.indexOf(inputIndex), 1);
        }
        if (this.inputIndices.length === 0) {
            document.removeEventListener("keydown", this.enterHandler);
            this.enterHandler = null;
        }
    }

    blurInput() {
        for (let i of this.inputIndices) {
            for (let j = 1; j < this.matrix.length; j++) {
                this.table.rows[j].cells[i + 1].firstElementChild.blur();
            }
        }
    }

    refreshWithInput() {
        this.syncMatrixWithTable();
        this.recalculate();
        this.refreshSummary();
    }

    removeRow(rowIndex) {
        let name = this.rowOwnerNames[rowIndex];
        let r = [...this.matrix[rowIndex]];
        this.sideTables[name].appendRow(this.adapters[name](r));
        this.matrix.splice(rowIndex, 1);
        this.rowOwnerNames.splice(rowIndex, 1);
        this.table.deleteRow(rowIndex);
        this.recalculate();
        this.refreshSummary();
    }

    appendRow(rowArray, ownerName) {
        this.matrix.push(rowArray);
        this.rowOwnerNames.push(ownerName);

        let row;
        if (this.summarizer !== null) {
            row = this.table.insertRow(this.matrix.length - 1);
        } else {
            row = this.table.insertRow();
        }
        let cell = row.insertCell(0);
        cell.id = rowArray[0];
        cell.style.cursor = "pointer";
        cell.style.color = "red";
        cell.style.fontWeight = "bold";
        cell.innerHTML = this.actionSymbol;
        for (let i = 0; i < rowArray.length; i++) {
            cell = row.insertCell(i + 1);
            cell.style.textAlign = this.aligns[i];
            if (this.inputIndices.includes(i)) {
                let input = document.createElement("input");
                input.className = this.cssClassInput;
                input.maxLength = 7;
                input.size = 5;
                input.value = rowArray[i];
                cell.appendChild(input);
                let t = this;
                input.addEventListener("blur", function() {
                    t.refreshWithInput();
                });
            } else {
                cell.innerHTML = rowArray[i];
            }
        }
        this.setRowListeners(row);

        this.recalculate();
        this.refreshSummary();
    }

    appendMatrix(matrix, ownerNames) {
        for (let i = 0; i < matrix.length; i++) {
            this.appendRow(matrix[i], ownerNames[i]);
        }
    }

}

