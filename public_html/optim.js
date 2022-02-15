
import {Matrix} from "./Matrix.js";
import {Port} from "./Port.js";

export {setOptim};

function setOptim(glob) {
    let optimize = function() {
        if (glob.table.port.matrix.length > 2) {
            let matrix = new Matrix(glob.table.port.matrix);
            let indices = glob.data.tickers.fiof(matrix.decap().cols(0));
            let covcc = glob.data.covcc[glob.cur].sub(indices).mult(0.0001);
            let er = matrix.decap().cols(6).mult(0.01);
            let cov = covcc.exp().minus(1).dot(er.plus(1).mult(er.plus(1).t()));
            let rho = Number(glob.html.targetInput.value);
            if (!isNaN(rho)) {
                let port = new Port(cov.mult(10000).arr, er.mult(100).arr, rho);          
                glob.html.optButton.disabled = true;
                glob.html.thinker.style.visibility = "visible";
                window.setTimeout(function() {
                    port.optimize();                        
                    let money = new Matrix(port.w).roundw(3).mult(1000);
                    glob.table.port.matrix = matrix.plugc(money, 2).arr; //!!!
                    glob.table.port.recalculate();
                    glob.table.port.refreshSummary();
                    glob.html.thinker.style.visibility = "hidden";
                    glob.html.optButton.disabled = false;
                }, 50);
            } else {
                glob.html.targetInput.value = "NaN";
            }             
        }
    };
    glob.html.optButton.addEventListener("click", optimize);
    document.addEventListener("keydown", function(event) {
        if (event["keyCode"] === 13) {
            if (document.activeElement === glob.html.targetInput) {
                glob.html.targetInput.blur();
                optimize();
            }
        }
    });
}
