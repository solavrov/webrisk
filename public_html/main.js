/* global firebase, math, google */

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
    arrToMtx,
    makeHistogramData,
    getPortErForTimes,
    getQForTimes,
    makePortPath
} from "./funs.js";

let glob = {
    data: {},
    html: {},
    pathChart: {}
};

glob.daysYear = 250;
glob.alfa95 = -1.645;
glob.alfa99 = -2.326;
glob.sampleSize = 1000;
glob.curList = ['rub', 'usd', 'eur'];
glob.cur = 'rub';
glob.wideSpace = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
glob.accEr = 2;
glob.accQ = 2;
glob.accQTotal = 0;
glob.accShare = 3;

glob.data.tickers = [];
glob.data.types = [];
glob.data.names = [];
glob.data.er = {};
glob.data.cov = {};
glob.data.ercc = {};
glob.data.covcc = {};
glob.data.sample = {};
glob.data.sigma = {};
glob.data.sigmacc = {};
glob.data.var95 = {};
glob.data.var99 = {};
glob.data.assetTableMtx = {};
glob.data.portSample = [];

glob.html.body  = document.getElementById("body");
glob.html.loader = document.getElementById("loader");
glob.html.updateInfo  = document.getElementById("updateInfo");
glob.html.stockUsBox = document.getElementById("stockUsBox");
glob.html.stockRuBox = document.getElementById("stockRuBox");
glob.html.bondBox = document.getElementById("bondBox");
glob.html.commodityBox = document.getElementById("commodityBox");
glob.html.etfBox = document.getElementById("etfBox");
glob.html.cryptoBox = document.getElementById("cryptoBox");
glob.html.portBox = document.getElementById("portBox");
glob.html.curPick = document.getElementsByName("curPick");
glob.html.targetInput = document.getElementById("targetInput");
glob.html.optButton = document.getElementById("optButton");
glob.html.distChart = document.getElementById("distChart");
glob.html.pathChart = document.getElementById("pathChart");
glob.html.thinker = document.getElementById("thinker");
glob.html.resampButton = document.getElementById("resampButton");
glob.html.thinker2 = document.getElementById("thinker2");
glob.html.pathButton = document.getElementById("pathButton");

glob.pathChart.accEr = 3;
glob.pathChart.accQ = 3;
glob.pathChart.animDelay = 5;
glob.pathChart.animStep = 3;
glob.pathChart.tStep = 2;
glob.pathChart.tPoints = [0, 50, 100, 150, 200, 250];


const DAYS_IN_YEAR = 250;
const ALFA_95 = -1.645;
const ALFA_99 = -2.326;
const ACCURACY = 2;
const ACCURACY_ER = 2;
const ACCURACY_CHART_ER = 3;
const ACCURACY_CHART_Q = 3;
const ACCURACY_SHARE = 3;
const ACCURACY_MC = 0;
const CHART_ANIMATION_DELAY = 5;
const CHART_ANIMATION_STEP = 3;
const CHART_TIME_STEP = 2;
const SAMPLE_SIZE = 1000;
const CURRENCIES = ['rub', 'usd', 'eur'];
const WIDE_SPACE = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";

// -----------------Loading google charts------------------------
google.charts.load('current', {'packages':['corechart'], 'language':'en'});

// ---------------Web app's Firebase configuration---------------
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
// --------------Initialize Firebase---------------
firebase.initializeApp(firebaseConfig);
//firebase.analytics();
// ---------------Get database reference-----------------
const dbRef = firebase.database().ref();

// ---------------Html elements-------------------
const body  = document.getElementById("body");
const loader = document.getElementById("loader");
const updateInfo  = document.getElementById("updateInfo");
const stockUsBox = document.getElementById("stockUsBox");
const stockRuBox = document.getElementById("stockRuBox");
const bondBox = document.getElementById("bondBox");
const commodityBox = document.getElementById("commodityBox");
const etfBox = document.getElementById("etfBox");
const cryptoBox = document.getElementById("cryptoBox");
const portBox = document.getElementById("portBox");
const curPick = document.getElementsByName("curPick");
const targetInput = document.getElementById("targetInput");
const optButton = document.getElementById("optButton");
const distChart = document.getElementById("distChart");
const pathChart = document.getElementById("pathChart");
const thinker = document.getElementById("thinker");
const resampButton = document.getElementById("resampButton");
const thinker2 = document.getElementById("thinker2");
const pathButton = document.getElementById("pathButton");

// ------------------Main-------------------------
dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        loader.style.visibility = "hidden";
        body.style.visibility = "visible";

        //--------------getting data--------------
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
        let PORT_SAMPLE = [];
        
        for (let c of CURRENCIES) {
            ER[c] = math.round(snapshot.child("er_" + c).val(), ACCURACY_ER);
            COV[c] = snapshot.child("cov_" + c).val();
            ERCC[c] = math.round(snapshot.child("ercc_" + c).val(), ACCURACY_ER);            
            COVCC[c] = snapshot.child("covcc_" + c).val();
            SAMPLE[c] = makeSample(COVCC[c], SAMPLE_SIZE, true);
            SIGMA[c] = math.round(math.sqrt(math.diag(COV[c])), ACCURACY);
            SIGMACC[c] = math.sqrt(math.diag(COVCC[c]));
            VAR95[c] = math.round(contToSimp(math.add(ERCC[c], math.multiply(SIGMACC[c], ALFA_95))), ACCURACY);
            VAR99[c] = math.round(contToSimp(math.add(ERCC[c], math.multiply(SIGMACC[c], ALFA_99))), ACCURACY);
            ASSET_MATRICES[c] = math.transpose([TICKERS, NAMES, SIGMA[c], VAR95[c], VAR99[c], ER[c]]);
        }
        let cur = 'rub';
        
        //-----------------building asset tables-------------------
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
        
        //-----------------building port table------------------
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
        
        //-----------------recalculator-----------------------
        let recalculator = function(matrix) {
            if (matrix.length > 1) {
                //----------------recalc weights-----------------
                let money = getCols(matrix, 1, false);
                let w = math.round(math.multiply(money, 1 / math.sum(money)), ACCURACY_SHARE);
                matrix = insertCols(matrix, w, 2);
                
                //------------------recalc vars-------------------
                let i = getIndices(TICKERS, colToArr(getCols(matrix, 0, false)));
                let er = math.divide(colToArr(getCols(matrix, 6, false)), 100);
                let sigmacc = math.divide(getVals(SIGMACC[cur], i), 100);
                let ercc = math.subtract(math.log(math.add(1, er)), math.divide(math.square(sigmacc), 2));
                let var95 = math.round(contToSimp(math.multiply(math.add(ercc, math.multiply(sigmacc, ALFA_95)), 100)), ACCURACY);
                let var99 = math.round(contToSimp(math.multiply(math.add(ercc, math.multiply(sigmacc, ALFA_99)), 100)), ACCURACY);
                matrix = insertCols(matrix, var95, 4);
                matrix = insertCols(matrix, var99, 5);
                
                //---------------------recalc vols-------------------
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
        
        //-----------------summarizer--------------------
        let summarizer = function(matrix) {
            let total = ["TOTAL", 0, 0, 0, 0, 0, 0];
            PORT_SAMPLE = [];
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
                //Monte Cralo VaR for Port
                let p = 
                        math.dotMultiply(
                            math.add(1, colToArr(er)),
                            math.exp(math.divide(math.square(math.divide(getVals(SIGMACC[cur], i), 100)), -2))
                        );
                p = arrToMtx(p, SAMPLE_SIZE);
                PORT_SAMPLE = math.subset(SAMPLE[cur], math.index(i, math.range(0, SAMPLE_SIZE)));
                PORT_SAMPLE = math.multiply(math.subtract(math.dotMultiply(PORT_SAMPLE, p), 1), 100);
                PORT_SAMPLE = math.multiply(math.transpose(w), PORT_SAMPLE)[0];
                total[4] = "&#8776; " + math.round(math.quantileSeq(PORT_SAMPLE, 0.05), ACCURACY_MC);
                total[5] = "&#8776; " + math.round(math.quantileSeq(PORT_SAMPLE, 0.01), ACCURACY_MC);
            }
            
            document.dispatchEvent(new Event("summarized"));
            
            return total;
        };    
        portTable.addSummary(summarizer, "sum", ["black", "black", "black", "black", "red", "red", "green"]);
        
        //-------------------adding inputs to port--------------------
        portTable.addInput(1);
        portTable.addInput(6);
        
        //------------------linking tables-----------------------
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
        
        //------------------appending tables to html--------------------
        stockUsBox.appendChild(stockUsTable.table);
        stockRuBox.appendChild(stockRuTable.table);
        bondBox.appendChild(bondTable.table);
        commodityBox.appendChild(commodityTable.table);
        etfBox.appendChild(etfTable.table);
        cryptoBox.appendChild(cryptoTable.table);
        portBox.appendChild(portTable.table);
        
        //-------------------changing currency----------------------
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
        
        //----------------------optimizing---------------------------       
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
                    
                    optButton.disabled = true;
                    thinker.style.visibility = "visible";

                    window.setTimeout(function() {
                        port.optimize();
                        let money = math.multiply(roundWeights(port.w, 3, 1), 1000);
                        let indicesFrom = math.index(math.range(0, money.length), 0);
                        let indicesTo = math.index(math.range(1, money.length + 1), 1);
                        portTable.matrix = insert(money, portTable.matrix, indicesFrom, indicesTo);
                        portTable.recalculate();
                        portTable.refreshSummary();
                        thinker.style.visibility = "hidden";
                        optButton.disabled = false;
                    }, 1);
                    
                } else {
                    targetInput.value = "NaN";
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
        
//        targetInput.addEventListener("blur", function() {
//            optimize();
//        });
        

        
        //---------------ditribution chart--------------------
        google.charts.setOnLoadCallback(initDist);

        function initDist() {

            let options = {
               
                legend: { position: 'none' },
                width: 600,
                height: 360,

                chartArea: {width: 500, height: 300},
                
                animation: {
                    duration: 300,
                    startup: true
                },

                bar: { 
                   groupWidth: '100%'
                },

                hAxis: {
                    title: 'returns',
                    baselineColor: 'none',
                    titleTextStyle: {
                        italic: false
                    }
                },
                
                vAxis: {
                    title: 'outcomes',
                    titleTextStyle: {
                        italic: false
                    },
                    minValue: 0,
                    maxValue: 1
                }
                

            };

            let chart = new google.visualization.ColumnChart(distChart);

            function draw() {
                let data = makeHistogramData(PORT_SAMPLE, -100, 200, 5);
                let dataTable = new google.visualization.DataTable();
                dataTable.addColumn('number', 'x');
                dataTable.addColumn('number', 'y');
                dataTable.addColumn({type: 'string', role: 'tooltip'});
                dataTable.addColumn({type: 'string', role: 'style'});
                dataTable.addRows(data);
                chart.draw(dataTable, options);
            }

            draw();
            
            let title = document.createElement('div');
            title.className = 'chartTitle';
            title.innerHTML = 'Distribution of returns';
            distChart.childNodes[0].childNodes[0].append(title);
            
            document.addEventListener("summarized", draw);

        }
        
        //-----------------new sample----------------
        resampButton.addEventListener("click", function() {
            if (portTable.matrix.length > 1) {
                resampButton.disabled = true;
                thinker2.style.visibility = "visible";
                window.setTimeout(function() {
                    for (let c of CURRENCIES) {
                        SAMPLE[c] = makeSample(COVCC[c], SAMPLE_SIZE, true);
                    };
                    portTable.refreshSummary();
                    thinker2.style.visibility = "hidden";
                    resampButton.disabled = false;
                }, 1);
            }
        });
        
        //-----------------path chart---------------------
        const tPoints = [0, 50, 100, 150, 200, 250];
        
        google.charts.setOnLoadCallback(initPath);
        
        function initPath() {
            
            let chart = new google.visualization.ComboChart(pathChart);
            
            let options0 = {

                hAxis: {    
                    title: 'days',
                    titleTextStyle: { italic: false },
                    viewWindow: { min: 0, max: tPoints[tPoints.length - 1] * 1.01 }
                },

                vAxis: {
                    title: 'return',
                    titleTextStyle: { italic: false },
                    minValue: -1,
                    maxValue: 1
                },

                series: {
                    0: { type: 'line', color: 'blue', pointShape: 'circle', pointSize: 5 },
                    1: { type: 'area'}
                },

                lineWidth: 2,
                width: 600,
                height: 360,

                chartArea: {width: 500, height: 300},

                legend: { position: 'none' },
                
                intervals: { 
                    style: 'bars',
                    barWidth: 0.2,
                    lineWidth: 2
                },
                
                animation: {
                    duration: 300,
                    startup: true
                }

            };
            
            let options = {...options0};
            options.intervals = { 
                style: 'bars',
                barWidth: tPoints[tPoints.length - 1] / CHART_TIME_STEP / 25 * 1.2,
                lineWidth: 2
            };
            delete options.animation;
            
            function makeData(isPath) {
                let d = [];
                if (portTable.matrix.length > 1) {
                    let matrix = lessHeader(portTable.matrix);
                    let er = colToArr(math.divide(math.column(matrix, 6), 100));
                    let money = math.column(matrix, 1);
                    let w = colToArr(math.multiply(money, 1 / math.sum(money)));
                    let qcc5 = math.log(1 + math.quantileSeq(PORT_SAMPLE, 0.05) / 100);
                    let qcc95 = math.log(1 + math.quantileSeq(PORT_SAMPLE, 0.95) / 100);
                    let indices = getIndices(TICKERS, colToArr(math.column(matrix, 0)));
                    let sigmacc = math.divide(getVals(SIGMACC[cur], indices), 100);
                    let ercc = math.add(math.log(math.add(1, er)), math.divide(math.square(sigmacc), -2));
                    let erccAvg = math.sum(math.dotMultiply(ercc, w));
                    d = [
                        tPoints,
                        math.round(getPortErForTimes(er, w,  DAYS_IN_YEAR, tPoints), ACCURACY_CHART_ER),
                        math.round(getQForTimes(qcc5, erccAvg, DAYS_IN_YEAR, tPoints), ACCURACY_CHART_Q),
                        math.round(getQForTimes(qcc95, erccAvg, DAYS_IN_YEAR, tPoints), ACCURACY_CHART_Q)
                    ];
                    let tips = [];
                    for (let i = 0; i < tPoints.length; i++) {
                        tips.push("expected return " + d[1][i] + "\n90% in [" + d[2][i] + ", " + d[3][i] + "]");
                    }
                    d.push(tips);
                    let nullArr = new Array(tPoints.length).fill(null);
                    d.splice(d.length, 0, nullArr, nullArr);
                    d = math.transpose(d);
                    if (isPath) {
                        let covcc = math.divide(math.subset(COVCC[cur], math.index(indices, indices)), 10000);
                        let path = makePortPath(w, ercc, covcc, DAYS_IN_YEAR, tPoints[tPoints.length - 1], CHART_TIME_STEP);
                        d.push([0, null, null, null, null, 0, 'color: green']);
                        for (let i = 0; i < path.r.length; i++) {
                            if (path.r[i] >= 0) d.push([path.t[i], null, null, null, null, path.r[i], 'color: green']);
                            if (path.r[i] < 0) d.push([path.t[i], null, null, null, null, path.r[i], 'color: red']);
                        }
                    }
                }
                return d;
            }
            
            function makeChartData() {
                let data = new google.visualization.DataTable();
                data.addColumn('number', 'time');
                data.addColumn('number', 'mean');
                data.addColumn({type:'number', role:'interval'});
                data.addColumn({type:'number', role:'interval'});
                data.addColumn({type:'string', role:'tooltip'});
                data.addColumn('number', 'return');
                data.addColumn({type: 'string', role: 'style'});
                return data;
            }
            
            function draw0() {
                let d = makeData(false);
                let data = makeChartData();
                data.addRows(d);
                chart.draw(data, options0);
            }
            
            function draw() {
                if (portTable.matrix.length > 1) {
                    pathButton.disabled = true;
                    let d = makeData(true);
                    let data = makeChartData();
                    for (let i = 0; i < tPoints.length; i++) data.addRows([d[i]]);
                    function go(j, k) {
                        if (k > d.length) k = d.length;
                        for (let i = j; i < k; i++) data.addRows([d[i]]);
                        chart.draw(data, options);
                        setTimeout(function() {    
                            if (k < d.length) go(k, k + CHART_ANIMATION_STEP);
                            else pathButton.disabled = false;
                        }, CHART_ANIMATION_DELAY);
                    }
                    go(tPoints.length, tPoints.length + CHART_ANIMATION_STEP);
                }
            }
            
            draw0();
            
            let title = document.createElement('div');
            title.className = 'chartTitle';
            title.innerHTML = 'Portfolio path';
            pathChart.childNodes[0].childNodes[0].append(title);
            
            document.addEventListener("summarized", draw0);
            pathButton.addEventListener("click", draw);
            
        }
        

        
        





    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
