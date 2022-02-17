/* global math */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {Matrix} from "./Matrix.js";

export {buildTables};

function buildTables(glob) {
    
    //-----------------building asset tables-------------------
    let assetHeader = [ //!!!
        "Ticker", 
        glob.wideSpace + "Name" + glob.wideSpace, 
        "VaR_95", 
        "Upside_95", 
        "Expected return"
    ];
    let assetAligns = ["center", "left", "right", "right", "right"];
    function pick(name) {
        return glob.data.assetMatrices[glob.cur].rows(glob.data.types.aiof(name)).arr;
    }
    glob.table.stockUs = new SideTable(assetHeader, "us_stocks", "linked", assetAligns, "US Stocks");
    glob.table.stockUs.appendMatrix(pick("stock_us"));
    glob.table.stockRu = new SideTable(assetHeader, "ru_stocks", "linked", assetAligns, "RU Stocks");
    glob.table.stockRu.appendMatrix(pick("stock_ru"));
    glob.table.bond = new SideTable(assetHeader, "bonds", "linked", assetAligns, "Bonds");
    glob.table.bond.appendMatrix(pick("bond"));
    glob.table.commodity = new SideTable(assetHeader, "commodities", "linked", assetAligns, "Commodities");
    glob.table.commodity.appendMatrix(pick("commodity"));
    glob.table.etf = new SideTable(assetHeader, "etfs", "linked", assetAligns, "ETFs");
    glob.table.etf.appendMatrix(pick("etf"));
    glob.table.crypto = new SideTable(assetHeader, "crypto", "linked", assetAligns, "Crypto");
    glob.table.crypto.appendMatrix(pick("crypto"));

    //-----------------building port table------------------
    let portHeader = [ //!!!
        "Ticker", 
        "Money", 
        "Share", 
        "VaR_95", 
        "Upside_95", 
        "Expected return"];
    let portAligns = ["center", "right", "right", "right", "right", "right"];
    glob.table.port = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");

    //-----------------recalculator-----------------------
    let recalculator = function(matrix) {
        matrix = new Matrix(matrix);
        if (matrix.nrow() > 1) {
            matrix = matrix.plugc(matrix.decap().cols(1).abs(), 1);
            let money = matrix.decap().cols(1); //!!!
            if (money.sum() === 0) {
                matrix = matrix.plugc(Matrix.zeros(matrix.nrow() - 1, 1).plus(100), 1);
                money = matrix.decap().cols(1);
            }
            let w = money.mult(1 / money.sum()).round(glob.accShare);
            let indices = glob.data.tickers.fiof(matrix.decap().cols(0));
            let er = matrix.cols(5).decap().mult(0.01); //!!!
            let sigmacc = glob.data.sigmacc[glob.cur].t().rows(indices).mult(0.01);
            let ercc = er.plus(1).log().minus(sigmacc.sq().mult(0.5));
            let var95 = ercc.plus(sigmacc.mult(glob.alfa95)).mult(100).toSimp().round(glob.accQ);
            let med = ercc.mult(100).toSimp().round(glob.accQ);
            let up95 = ercc.plus(sigmacc.mult(-glob.alfa95)).mult(100).toSimp().round(glob.accQ);
            matrix = matrix.plugc(w, 2).plugc(var95, 3).plugc(up95, 4); //!!!
        }
        return matrix.arr;
    };
    glob.table.port.addRecalculator(recalculator);

    //-----------------summarizer--------------------
    let summarizer = function(matrix) {
        let total = ["TOTAL", 0, 0, 0, 0, 0]; //!!!
        if (matrix.length > 1) {
            matrix = new Matrix(matrix).decap();
            total[1] = matrix.cols(1).sum(); //!!!
            let money = matrix.cols(1); //!!!
            let w = money.mult(1 / money.sum());
            total[2] = math.round(w.sum(), glob.accShare); //!!!
            let indices = glob.data.tickers.fiof(matrix.cols(0));
            let covcc = glob.data.covcc[glob.cur].sub(indices).mult(0.0001);
            let er = matrix.cols(5).mult(0.01); //!!!
            total[5] = w.t().mult(er).mult(100).round(glob.accEr).val(); //!!!
            let sample = glob.data.sample[glob.cur].rows(indices);
            let simpRatesSample = (er.plus(1)).dot(covcc.diag().mult(-0.5).exp()).dot(sample).minus(1).mult(100);
            glob.data.portSample = w.t().mult(simpRatesSample);
            total[3] = "&#8776; " + math.round(glob.data.portSample.q(0.05),glob.accQTotal); //!!!
            total[4] = "&#8776; " + math.round(glob.data.portSample.q(0.95),glob.accQTotal); //!!!
        } else {
            glob.data.portSample = new Matrix([]);
        }
        document.dispatchEvent(new Event("summarized"));
        return total;
    };    
    glob.table.port.addSummary(summarizer, "sum", ["black", "black", "black", "red", "DodgerBlue", "green"]);

    //-------------------adding inputs to port--------------------
    glob.table.port.addInput(1); //!!!
    glob.table.port.addInput(5); //!!!

    //------------------linking tables-----------------------
    let assetToPort = function(row) { //!!!
        let r = [];
        r.push(row[0]);
        r.push(100);
        r.push(0);
        r.push(row[2]);
        r.push(row[3]);
        r.push(row[4]);
        return r;
    };
    let portToAsset = function(row) { //!!!
        let i = glob.data.tickers.arr[0].indexOf(row[0]);
        let r = [];
        r.push(glob.data.tickers.arr[0][i]);
        r.push(glob.data.names.arr[0][i]);
        r.push(glob.data.var95[glob.cur].arr[0][i]);
        r.push(glob.data.up95[glob.cur].arr[0][i]);
        r.push(glob.data.er[glob.cur].arr[0][i]);
        return r;
    };
    glob.table.port.link(glob.table.stockUs, portToAsset, assetToPort);
    glob.table.port.link(glob.table.stockRu, portToAsset, assetToPort);
    glob.table.port.link(glob.table.bond, portToAsset, assetToPort);
    glob.table.port.link(glob.table.commodity, portToAsset, assetToPort);
    glob.table.port.link(glob.table.etf, portToAsset, assetToPort);
    glob.table.port.link(glob.table.crypto, portToAsset, assetToPort);

    //------------------appending tables to html--------------------
    glob.html.stockUsBox.appendChild(glob.table.stockUs.table);
    glob.html.stockRuBox.appendChild(glob.table.stockRu.table);
    glob.html.bondBox.appendChild(glob.table.bond.table);
    glob.html.commodityBox.appendChild(glob.table.commodity.table);
    glob.html.etfBox.appendChild(glob.table.etf.table);
    glob.html.cryptoBox.appendChild(glob.table.crypto.table);
    glob.html.portBox.appendChild(glob.table.port.table);
    
}

