export {SideTable};

class SideTable {
    constructor(headerArray, name, cssClass, aligns, caption="", rowHighlightColor="#c2ffc2", actionSymbol="&#10010;", blankSymbol="&#9586;") {
        this.matrix = [headerArray];
        this.name = name;
        this.aligns = aligns;
        this.centerTable = null;
        this.adapter = null;
        this.rowHighlightColor = rowHighlightColor;
        this.actionSymbol = actionSymbol;

        this.table = document.createElement("table");
        this.table.createCaption();
        this.table.caption.textContent = caption;
        this.table.className = cssClass;
        let row = this.table.insertRow();
        let cell = document.createElement("th");
        cell.innerHTML = blankSymbol;
        row.appendChild(cell);
        for (let i = 0; i < headerArray.length; i++) {
            cell = document.createElement("th");
            cell.innerHTML = headerArray[i];
            row.appendChild(cell);
        }
    }

    getRowIndex(key) {
        let i;
        for (i = 0; i < this.matrix.length; i++) {
            if (this.matrix[i][0].toString() === key.toString()) break;
        }
        return i;
    }

    syncTableWithMatrix() {
        for (let j = 1; j < this.matrix.length; j++) {
            for (let i = 0; i < this.matrix[j].length; i++) {
                this.table.rows[j].cells[i + 1].innerHTML = this.matrix[j][i];
            }
        }
    }
    
    removeRow(rowIndex) {
        let r = [...this.matrix[rowIndex]];
        this.centerTable.appendRow(this.adapter(r), this.name);
        this.matrix.splice(rowIndex, 1);
        this.table.deleteRow(rowIndex);
    }

    appendRow(rowArray) {
        this.matrix.push(rowArray);
        let row = this.table.insertRow();
        let cell = row.insertCell(0);
        cell.id = rowArray[0];
        cell.style.cursor = "pointer";
        cell.style.color = "green";
        cell.style.fontWeight = "bold";
        cell.innerHTML = this.actionSymbol;
        for (let i = 0; i < rowArray.length; i++) {
            cell = row.insertCell(i + 1);
            cell.style.textAlign = this.aligns[i];
            cell.innerHTML = rowArray[i];
        }
        this.setRowListeners(row);
    }

    setRowListeners(row) {
        let t = this;
        let handler = function(event) {
            let i = t.getRowIndex(event.target.id);
            t.removeRow(i);
        };
        row.cells[0].addEventListener("click", handler);

        row.addEventListener("mouseover", function (event) {
            event.currentTarget.style.backgroundColor = t.rowHighlightColor;
        });
        row.addEventListener("mouseout", function (event) {
            event.currentTarget.style.backgroundColor = "";
        });
    }

    appendMatrix(matrix) {
        for (let i = 0; i < matrix.length; i++) {
            this.appendRow(matrix[i]);
        }
    }

}
