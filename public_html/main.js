/* global firebase, math, google */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {Port} from "./Port.js";
import {Matrix} from "./Matrix.js";
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


//-------------Global variables and constants-------------
let glob = {
    data: {},
    html: {},
    chart: {
        path: {}
    }
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
glob.data.assetMatrices = {};
glob.data.portSample = [];

glob.chart.path.accEr = 3;
glob.chart.path.accQ = 3;
glob.chart.path.animDelay = 5;
glob.chart.path.animStep = 3;
glob.chart.path.tStep = 2;
glob.chart.path.tPoints = [0, 50, 100, 150, 200, 250];

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

// ------------------Main-------------------------
dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        glob.html.loader.style.visibility = "hidden";
        glob.html.body.style.visibility = "visible";

        //--------------getting data--------------
        glob.html.updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
        glob.data.tickers = snapshot.child("tickers").val();
        glob.data.types = snapshot.child("types").val();
        glob.data.names = snapshot.child("names").val();
        
        for (let c of glob.curList) {
            glob.data.er[c] = math.round(snapshot.child("er_" + c).val(), glob.accEr);
            glob.data.cov[c] = snapshot.child("cov_" + c).val();
            glob.data.ercc[c] = math.round(snapshot.child("ercc_" + c).val(), glob.accEr);            
            glob.data.covcc[c] = snapshot.child("covcc_" + c).val();
            glob.data.sample[c] = makeSample(glob.data.covcc[c], glob.sampleSize, true);
            glob.data.sigma[c] = math.round(math.sqrt(math.diag(glob.data.cov[c])), glob.accQ);
            glob.data.sigmacc[c] = math.sqrt(math.diag(glob.data.covcc[c]));
            glob.data.var95[c] = math.round(contToSimp(math.add(glob.data.ercc[c], math.multiply(glob.data.sigmacc[c], glob.alfa95))), glob.accQ);
            glob.data.var99[c] = math.round(contToSimp(math.add(glob.data.ercc[c], math.multiply(glob.data.sigmacc[c], glob.alfa99))), glob.accQ);
            glob.data.assetMatrices[c] = math.transpose([glob.data.tickers, glob.data.names, glob.data.sigma[c], glob.data.var95[c], glob.data.var99[c], glob.data.er[c]]);
        }
        
        //-----------------building asset tables-------------------
        let assetHeader = ["Ticker", glob.wideSpace + "Name" + glob.wideSpace, "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let assetAligns = ["center", "left", "right", "right", "right", "right", "right"];
        
        let stockUsTable = new SideTable(assetHeader, "us_stocks", "linked", assetAligns, "US Stocks");
        stockUsTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "stock_us")));

        let stockRuTable = new SideTable(assetHeader, "ru_stocks", "linked", assetAligns, "RU Stocks");
        stockRuTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "stock_ru")));
        
        let bondTable = new SideTable(assetHeader, "bonds", "linked", assetAligns, "Bonds");
        bondTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "bond")));

        let commodityTable = new SideTable(assetHeader, "commodities", "linked", assetAligns, "Commodities");
        commodityTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "commodity")));
        
        let etfTable = new SideTable(assetHeader, "etfs", "linked", assetAligns, "ETFs");
        etfTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "etf")));
        
        let cryptoTable = new SideTable(assetHeader, "crypto", "linked", assetAligns, "Crypto");
        cryptoTable.appendMatrix(getRows(glob.data.assetMatrices[glob.cur], allIndices(glob.data.types, "crypto")));
        
        //-----------------building port table------------------
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
        
        //-----------------recalculator-----------------------
        let recalculator = function(matrix) {
            matrix = new Matrix(matrix);
            if (matrix.nrow() > 1) {
                let money = matrix.decap().cols(1);
                let w = money.mult(1 / money.sum()).round(glob.accShare);
                let indices = new Matrix(glob.data.tickers).fiof(matrix.decap().cols(0));
                let er = matrix.cols(6).decap().mult(0.01);
                let sigmacc = new Matrix(glob.data.sigmacc[glob.cur]).t().rows(indices).mult(0.01);
                let ercc = er.plus(1).log().minus(sigmacc.sq().mult(0.5));
                let var95 = ercc.plus(sigmacc.mult(glob.alfa95)).mult(100).toSimp().round(glob.accQ);
                let var99 = ercc.plus(sigmacc.mult(glob.alfa99)).mult(100).toSimp().round(glob.accQ);
                let sigma = sigmacc.sq().exp().minus(1).sqrt().dot(er.plus(1)).mult(100).round(glob.accQ);
                matrix = matrix.plugc(w, 2).plugc(sigma, 3).plugc(var95, 4).plugc(var99, 5);
            }
            return matrix.arr;
        };
        portTable.addRecalculator(recalculator);
        
        //-----------------summarizer--------------------
        let summarizer = function(matrix) {
            let total = ["TOTAL", 0, 0, 0, 0, 0, 0];
            if (matrix.length > 1) {
                matrix = new Matrix(matrix).decap();
                total[1] = matrix.cols(1).sum();
                let money = matrix.cols(1);
                let w = money.mult(1 / money.sum());
                total[2] = math.round(w.sum(), glob.accShare);
                let indices = new Matrix(glob.data.tickers).fiof(matrix.cols(0));
                let covcc = new Matrix(glob.data.covcc[glob.cur]).sub(indices).mult(0.0001);
                let er = matrix.cols(6).mult(0.01);
                let cov = covcc.exp().minus(1).dot(er.plus(1).t().gram());
                total[3] = w.t().mult(cov).mult(w).sqrt().mult(100).round(glob.accQ).val();
                total[6] = w.t().mult(er).mult(100).round(glob.accEr).val();                
                let sample = new Matrix(glob.data.sample[glob.cur]).rows(indices);
                let simpRatesSample = (er.plus(1)).dot(covcc.diag().mult(-0.5).exp()).breed(glob.sampleSize).dot(sample).minus(1).mult(100);
                let portSample = w.t().mult(simpRatesSample);
                total[4] = "&#8776; " + math.round(portSample.q(0.05),glob.accQTotal);
                total[5] = "&#8776; " + math.round(portSample.q(0.01),glob.accQTotal);
                glob.data.portSample = portSample.arr[0];
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
            let i = glob.data.tickers.indexOf(row[0]);
            let r = [];
            r.push(glob.data.tickers[i]);
            r.push(glob.data.names[i]);
            r.push(glob.data.sigma[glob.cur][i]);
            r.push(glob.data.var95[glob.cur][i]);
            r.push(glob.data.var99[glob.cur][i]);
            r.push(glob.data.er[glob.cur][i]);
            return r;
        };
        
        portTable.link(stockUsTable, portToAsset, assetToPort);
        portTable.link(stockRuTable, portToAsset, assetToPort);
        portTable.link(bondTable, portToAsset, assetToPort);
        portTable.link(commodityTable, portToAsset, assetToPort);
        portTable.link(etfTable, portToAsset, assetToPort);
        portTable.link(cryptoTable, portToAsset, assetToPort);
        
        //------------------appending tables to html--------------------
        glob.html.stockUsBox.appendChild(stockUsTable.table);
        glob.html.stockRuBox.appendChild(stockRuTable.table);
        glob.html.bondBox.appendChild(bondTable.table);
        glob.html.commodityBox.appendChild(commodityTable.table);
        glob.html.etfBox.appendChild(etfTable.table);
        glob.html.cryptoBox.appendChild(cryptoTable.table);
        glob.html.portBox.appendChild(portTable.table);
        
        //-------------------changing currency----------------------
        let refreshTableCur = function(table, iTo) {
            if (table.matrix.length > 1) {
                let jFrom = getIndices(glob.data.tickers, colToArr(getCols(table.matrix, 0, false)));
                if (jFrom.length > 0) {
                    let iFrom = [2, 3, 4, 5];
                    let jTo = math.range(1, table.matrix.length);
                    table.matrix = insert(glob.data.assetMatrices[glob.cur], table.matrix, math.index(jFrom, iFrom), math.index(jTo, iTo));
                    table.syncTableWithMatrix();
                }
            }
        };

        glob.html.curPick.forEach((elem) => elem.addEventListener("click", function(event) {
            glob.cur = event.target.value;
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
                let i = getIndices(glob.data.tickers, colToArr(math.column(matrix, 0)));
                let covcc = math.divide(math.subset(glob.data.covcc[glob.cur], math.index(i, i)), 10000);
                let er = math.divide(math.column(matrix, 6), 100);
                let cov = 
                        math.dotMultiply(
                            math.subtract(math.exp(covcc), 1),
                            math.multiply(math.add(1, er), math.transpose(math.add(1, er)))
                        );
                er = math.multiply(er, 100);
                cov = math.multiply(cov, 10000);
                let rho = Number(glob.html.targetInput.value);
                if (!isNaN(rho)) {
                    let port = new Port(cov, er, rho);
                    
                    glob.html.optButton.disabled = true;
                    glob.html.thinker.style.visibility = "visible";

                    window.setTimeout(function() {
                        port.optimize();
                        let money = math.multiply(roundWeights(port.w, 3, 1), 1000);
                        let indicesFrom = math.index(math.range(0, money.length), 0);
                        let indicesTo = math.index(math.range(1, money.length + 1), 1);
                        portTable.matrix = insert(money, portTable.matrix, indicesFrom, indicesTo);
                        portTable.recalculate();
                        portTable.refreshSummary();
                        glob.html.thinker.style.visibility = "hidden";
                        glob.html.optButton.disabled = false;
                    }, 1);
                    
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

            let chart = new google.visualization.ColumnChart(glob.html.distChart);

            function draw() {
                let data = makeHistogramData(glob.data.portSample, -100, 200, 5);
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
            glob.html.distChart.childNodes[0].childNodes[0].append(title);
            
            document.addEventListener("summarized", draw);

        }
        
        //-----------------new sample----------------
        glob.html.resampButton.addEventListener("click", function() {
            if (portTable.matrix.length > 1) {
                glob.html.resampButton.disabled = true;
                glob.html.thinker2.style.visibility = "visible";
                window.setTimeout(function() {
                    for (let c of glob.curList) {
                        glob.data.sample[c] = makeSample(glob.data.covcc[c], glob.sampleSize, true);
                    };
                    portTable.refreshSummary();
                    glob.html.thinker2.style.visibility = "hidden";
                    glob.html.resampButton.disabled = false;
                }, 1);
            }
        });
        
        //-----------------path chart---------------------
        google.charts.setOnLoadCallback(initPath);
        
        function initPath() {
            
            let chart = new google.visualization.ComboChart(glob.html.pathChart);
            
            let options0 = {

                hAxis: {    
                    title: 'days',
                    titleTextStyle: { italic: false },
                    viewWindow: { min: 0, max: glob.chart.path.tPoints[glob.chart.path.tPoints.length - 1] * 1.01 }
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
                barWidth: glob.chart.path.tPoints[glob.chart.path.tPoints.length - 1] / glob.chart.path.tStep / 25 * 1.2,
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
                    let qcc5 = math.log(1 + math.quantileSeq(glob.data.portSample, 0.05) / 100);
                    let qcc95 = math.log(1 + math.quantileSeq(glob.data.portSample, 0.95) / 100);
                    let indices = getIndices(glob.data.tickers, colToArr(math.column(matrix, 0)));
                    let sigmacc = math.divide(getVals(glob.data.sigmacc[glob.cur], indices), 100);
                    let ercc = math.add(math.log(math.add(1, er)), math.divide(math.square(sigmacc), -2));
                    let erccAvg = math.sum(math.dotMultiply(ercc, w));
                    d = [
                        glob.chart.path.tPoints,
                        math.round(getPortErForTimes(er, w,  glob.daysYear, glob.chart.path.tPoints), glob.chart.path.accEr),
                        math.round(getQForTimes(qcc5, erccAvg, glob.daysYear, glob.chart.path.tPoints), glob.chart.path.accQ),
                        math.round(getQForTimes(qcc95, erccAvg, glob.daysYear, glob.chart.path.tPoints), glob.chart.path.accQ)
                    ];
                    let tips = [];
                    for (let i = 0; i < glob.chart.path.tPoints.length; i++) {
                        tips.push("expected return " + d[1][i] + "\n90% in [" + d[2][i] + ", " + d[3][i] + "]");
                    }
                    d.push(tips);
                    let nullArr = new Array(glob.chart.path.tPoints.length).fill(null);
                    d.splice(d.length, 0, nullArr, nullArr);
                    d = math.transpose(d);
                    if (isPath) {
                        let covcc = math.divide(math.subset(glob.data.covcc[glob.cur], math.index(indices, indices)), 10000);
                        let path = makePortPath(w, ercc, covcc, glob.daysYear, glob.chart.path.tPoints[glob.chart.path.tPoints.length - 1], glob.chart.path.tStep);
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
                    glob.html.pathButton.disabled = true;
                    let d = makeData(true);
                    let data = makeChartData();
                    for (let i = 0; i < glob.chart.path.tPoints.length; i++) data.addRows([d[i]]);
                    function go(j, k) {
                        if (k > d.length) k = d.length;
                        for (let i = j; i < k; i++) data.addRows([d[i]]);
                        chart.draw(data, options);
                        setTimeout(function() {    
                            if (k < d.length) go(k, k + glob.chart.path.animStep);
                            else glob.html.pathButton.disabled = false;
                        }, glob.chart.path.animDelay);
                    }
                    go(glob.chart.path.tPoints.length, glob.chart.path.tPoints.length + glob.chart.path.animStep);
                }
            }
            
            draw0();
            
            let title = document.createElement('div');
            title.className = 'chartTitle';
            title.innerHTML = 'Portfolio path';
            glob.html.pathChart.childNodes[0].childNodes[0].append(title);
            
            document.addEventListener("summarized", draw0);
            glob.html.pathButton.addEventListener("click", draw);
            
        }
        

        
        





    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
