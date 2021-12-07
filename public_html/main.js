/* global firebase, math */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {Port} from "./Port.js";
import {
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
    arrToMtx
} from "./funs.js";

const DAYS_IN_YEAR = 250;
const ALFA_95 = -1.645;
const ALFA_99 = -2.326;
const ACCURACY = 2;
const ACCURACY_ER = 2;
const ACCURACY_SHARE = 3;
const SAMPLE_SIZE = 1000;
const CURRENCIES = ['rub', 'usd', 'eur'];
const WIDE_SPACE = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDA2rvK4pmbmstno1_ixUsM954Z9xSIa0E",
    authDomain: "risk-ffdb5.firebaseapp.com",
    databaseURL: "https://risk-ffdb5-default-rtdb.firebaseio.com",
    projectId: "risk-ffdb5",
    storageBucket: "risk-ffdb5.appspot.com",
    messagingSenderId: "845497685508",
    appId: "1:845497685508:web:4b6d56013c72ec89188751",
    measurementId: "G-KE20BBK7DT"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
//firebase.analytics();
// Get database reference
const dbRef = firebase.database().ref();

let body  = document.getElementById("body");
let loader = document.getElementById("loader");
let updateInfo  = document.getElementById("updateInfo");
let stockUsBox = document.getElementById("stockUsBox");
let stockRuBox = document.getElementById("stockRuBox");
let bondBox = document.getElementById("bondBox");
let commodityBox = document.getElementById("commodityBox");
let etfBox = document.getElementById("etfBox");
let cryptoBox = document.getElementById("cryptoBox");
let portBox = document.getElementById("portBox");
let curPick = document.getElementsByName("curPick");
let targetInput = document.getElementById("targetInput");
let optButton = document.getElementById("optButton");

dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        loader.style.visibility = "hidden";
        body.style.visibility = "visible";

        //getting data
        updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
        let TICKERS = snapshot.child("tickers").val();
        let TYPES = snapshot.child("types").val();
        let NAMES = snapshot.child("names").val();
        let ER = {};
        let COV = {};
        let ERCC = {};
        let COVCC = {};
        let SAMPLE = {};
        let SIGMA = {};
        let SIGMACC = {};
        let VAR95 = {};
        let VAR99 = {};
        let ASSET_MATRICES = {};
        for (let c of CURRENCIES) {
            ER[c] = math.round(snapshot.child("er_" + c).val(), ACCURACY_ER);
            COV[c] = snapshot.child("cov_" + c).val();
            ERCC[c] = math.round(snapshot.child("ercc_" + c).val(), ACCURACY_ER);
            COVCC[c] = snapshot.child("covcc_" + c).val();
            SAMPLE[c] = makeSample(COVCC[c], SAMPLE_SIZE, false);
            SIGMA[c] = math.round(math.sqrt(math.diag(COV[c])), ACCURACY);
            SIGMACC[c] = math.round(math.sqrt(math.diag(COVCC[c])), ACCURACY);
            VAR95[c] = math.round(contToSimp(math.add(ERCC[c], math.multiply(SIGMACC[c], ALFA_95))), ACCURACY);
            VAR99[c] = math.round(contToSimp(math.add(ERCC[c], math.multiply(SIGMACC[c], ALFA_99))), ACCURACY);
            ASSET_MATRICES[c] = math.transpose([TICKERS, NAMES, SIGMA[c], VAR95[c], VAR99[c], ER[c]]);
        }
        let cur = 'rub';
        
        //building asset tables
        let assetHeader = ["Ticker", WIDE_SPACE + "Name" + WIDE_SPACE, "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let assetAligns = ["center", "left", "right", "right", "right", "right", "right"];
        
        let stockUsTable = new SideTable(assetHeader, "us_stocks", "linked", assetAligns, "US Stocks");
        stockUsTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "stock_us")));

        let stockRuTable = new SideTable(assetHeader, "ru_stocks", "linked", assetAligns, "RU Stocks");
        stockRuTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "stock_ru")));
        
        let bondTable = new SideTable(assetHeader, "bonds", "linked", assetAligns, "Bonds");
        bondTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "bond")));

        let commodityTable = new SideTable(assetHeader, "commodities", "linked", assetAligns, "Commodities");
        commodityTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "commodity")));
        
        let etfTable = new SideTable(assetHeader, "etfs", "linked", assetAligns, "ETFs");
        etfTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "etf")));
        
        let cryptoTable = new SideTable(assetHeader, "crypto", "linked", assetAligns, "Crypto");
        cryptoTable.appendMatrix(getRows(ASSET_MATRICES[cur], allIndices(TYPES, "crypto")));
        
        //building port table
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
        let recalculator = function(matrix) {
            if (matrix.length > 1) {
                //recalc weights
                let money = getCols(matrix, 1, false);
                let w = math.round(math.multiply(money, 1 / math.sum(money)), ACCURACY_SHARE);
                matrix = insertCols(matrix, w, 2);
                
                //recalc vars
                let i = getIndices(TICKERS, colToArr(getCols(matrix, 0, false)));
                let er = math.divide(colToArr(getCols(matrix, 6, false)), 100);
                let sigmacc = math.divide(getVals(SIGMACC[cur], i), 100);
                let ercc = math.subtract(math.log(math.add(1, er)), math.divide(math.square(sigmacc), 2));
                let var95 = math.round(contToSimp(math.multiply(math.add(ercc, math.multiply(sigmacc, ALFA_95)), 100)), ACCURACY);
                let var99 = math.round(contToSimp(math.multiply(math.add(ercc, math.multiply(sigmacc, ALFA_99)), 100)), ACCURACY);
                matrix = insertCols(matrix, var95, 4);
                matrix = insertCols(matrix, var99, 5);
                
                //recalc vols
                let sigma = 
                        math.round(
                            math.multiply(
                                 math.dotMultiply(
                                    math.sqrt(math.subtract(math.exp(math.square(sigmacc)), 1)), 
                                    math.add(1, er)
                                 ),
                                 100
                            ),
                            ACCURACY
                        );
                matrix = insertCols(matrix, sigma, 3);
            }
            return matrix;
        };
        portTable.addRecalculator(recalculator);
        let summarizer = function(matrix) {
            let total = ["TOTAL", 0, 0, 0, 0, 0, 0];
            if (matrix.length > 1) {
                matrix.shift();
                total[1] = math.sum(math.column(matrix, 1));
                let money = math.column(matrix, 1);
                let w = math.multiply(money, 1 / math.sum(money));
                total[2] = math.round(math.sum(w), ACCURACY_SHARE);
                let i = getIndices(TICKERS, colToArr(math.column(matrix, 0)));
                let covcc = math.divide(math.subset(COVCC[cur], math.index(i, i)), 10000);
                let er = math.divide(math.column(matrix, 6), 100);
                let cov = 
                        math.dotMultiply(
                            math.subtract(math.exp(covcc), 1),
                            math.multiply(math.add(1, er), math.transpose(math.add(1, er)))
                        );
                total[3] = math.round(math.sum(math.multiply(math.sqrt(math.multiply(math.transpose(w), cov, w)), 100)), ACCURACY);
                total[6] = math.round(math.sum(math.multiply(math.transpose(w), math.column(matrix, 6))), ACCURACY_ER);
                
                let p = 
                        math.dotMultiply(
                            math.add(1, colToArr(er)),
                            math.exp(math.divide(math.square(math.divide(getVals(SIGMACC[cur], i), 100)), -2))
                        );
                p = arrToMtx(p, SAMPLE_SIZE);
                let sample = math.subset(SAMPLE[cur], math.index(i, math.range(0, SAMPLE_SIZE)));
                sample = math.multiply(math.subtract(math.dotMultiply(sample, p), 1), 100);
                sample = math.multiply(math.transpose(w), sample);
                total[4] = math.round(math.quantileSeq(sample, 0.05), ACCURACY);
                total[5] = math.round(math.quantileSeq(sample, 0.01), ACCURACY);
                
            } 
//            else if (matrix.length === 2) {
//                matrix.shift();
//                matrix[0][0] = "TOTAL";
//                total = matrix[0];
//            }
            return total;
        };    
        portTable.addSummary(summarizer);
        portTable.addInput(1);
        portTable.addInput(6);
        
        //linking tables
        let assetToPort = function(row) {
            let r = [];
            r.push(row[0]);
            r.push(100);
            r.push(0);
            r.push(row[2]);
            r.push(row[3]);
            r.push(row[4]);
            r.push(row[5]);
            return r;
        };
        let portToAsset = function(row) {
            let i = TICKERS.indexOf(row[0]);
            let r = [];
            r.push(TICKERS[i]);
            r.push(NAMES[i]);
            r.push(SIGMA[cur][i]);
            r.push(VAR95[cur][i]);
            r.push(VAR99[cur][i]);
            r.push(ER[cur][i]);
            return r;
        };
        
        portTable.link(stockUsTable, portToAsset, assetToPort);
        portTable.link(stockRuTable, portToAsset, assetToPort);
        portTable.link(bondTable, portToAsset, assetToPort);
        portTable.link(commodityTable, portToAsset, assetToPort);
        portTable.link(etfTable, portToAsset, assetToPort);
        portTable.link(cryptoTable, portToAsset, assetToPort);
        
        //appending tables to html
        stockUsBox.appendChild(stockUsTable.table);
        stockRuBox.appendChild(stockRuTable.table);
        bondBox.appendChild(bondTable.table);
        commodityBox.appendChild(commodityTable.table);
        etfBox.appendChild(etfTable.table);
        cryptoBox.appendChild(cryptoTable.table);
        portBox.appendChild(portTable.table);
        
        //changing currency
        let refreshTableCur = function(table, iTo) {
            if (table.matrix.length > 1) {
                let jFrom = getIndices(TICKERS, colToArr(getCols(table.matrix, 0, false)));
                if (jFrom.length > 0) {
                    let iFrom = [2, 3, 4, 5];
                    let jTo = math.range(1, table.matrix.length);
                    table.matrix = insert(ASSET_MATRICES[cur], table.matrix, math.index(jFrom, iFrom), math.index(jTo, iTo));
                    table.syncTableWithMatrix();
                }
            }
        };

        curPick.forEach((elem) => elem.addEventListener("click", function(event) {
            cur = event.target.value;
            refreshTableCur(stockUsTable, [2, 3, 4, 5]);
            refreshTableCur(stockRuTable, [2, 3, 4, 5]);
            refreshTableCur(bondTable, [2, 3, 4, 5]);
            refreshTableCur(commodityTable, [2, 3, 4, 5]);
            refreshTableCur(etfTable, [2, 3, 4, 5]);
            refreshTableCur(cryptoTable, [2, 3, 4, 5]);
            refreshTableCur(portTable, [3, 4, 5, 6]);
            portTable.refreshSummary();
        }));
        
        //optimizing
        let optimize = function() {
            if (portTable.matrix.length > 2) {
                let matrix = lessHeader(portTable.matrix);
                let i = getIndices(TICKERS, colToArr(math.column(matrix, 0)));
                let covcc = math.divide(math.subset(COVCC[cur], math.index(i, i)), 10000);
                let er = math.divide(math.column(matrix, 6), 100);
                let cov = 
                        math.dotMultiply(
                            math.subtract(math.exp(covcc), 1),
                            math.multiply(math.add(1, er), math.transpose(math.add(1, er)))
                        );
                er = math.multiply(er, 100);
                cov = math.multiply(cov, 10000);
                let rho = Number(targetInput.value);
                if (!isNaN(rho)) {
                    let port = new Port(cov, er, rho);
                    port.optimize();
                    console.log(port.w);
                    let money = math.multiply(roundWeights(port.w, 3, 1), 1000);
                    let indicesFrom = math.index(math.range(0, money.length), 0);
                    let indicesTo = math.index(math.range(1, money.length + 1), 1);
                    portTable.matrix = insert(money, portTable.matrix, indicesFrom, indicesTo);
                    portTable.recalculate();
                    portTable.refreshSummary();
                }
            }
        };
        
        optButton.addEventListener("click", optimize);
        
        document.addEventListener("keydown", function(event) {
            if (event["keyCode"] === 13) {
                if (document.activeElement === targetInput) {
                    targetInput.blur();
                    optimize();
                }
            }
        });
        
        targetInput.addEventListener("blur", function() {
            optimize();
        });
        
      
        
        






    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
