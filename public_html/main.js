/* global firebase, math, google */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {Port} from "./Port.js";
import {Matrix} from "./Matrix.js";
import {
    makeHistogramData
} from "./funs.js";


//-------------Global variables and constants-------------
let glob = {
    data: {},
    table: {},
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
glob.accQTotal = 1;
glob.accShare = 3;

glob.data.tickers = new Matrix([]);
glob.data.types = new Matrix([]);
glob.data.names = new Matrix([]);
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
glob.data.portSample = new Matrix([]);

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
        glob.data.tickers = new Matrix(snapshot.child("tickers").val());
        glob.data.types = new Matrix(snapshot.child("types").val());
        glob.data.names = new Matrix(snapshot.child("names").val());
        
        for (let c of glob.curList) {
            glob.data.er[c] = new Matrix(snapshot.child("er_" + c).val()).round(glob.accEr);
            glob.data.cov[c] = new Matrix(snapshot.child("cov_" + c).val());
            glob.data.ercc[c] = new Matrix(snapshot.child("ercc_" + c).val()).round(glob.accEr);
            glob.data.covcc[c] = new Matrix(snapshot.child("covcc_" + c).val());
            glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
            glob.data.sigma[c] = glob.data.cov[c].diag().t().sqrt().round(glob.accQ);            
            glob.data.sigmacc[c] = glob.data.covcc[c].diag().t().sqrt();            
            glob.data.var95[c] = glob.data.sigmacc[c].mult(glob.alfa95).plus(glob.data.ercc[c]).toSimp().round(glob.accQ);
            glob.data.var99[c] = glob.data.sigmacc[c].mult(glob.alfa99).plus(glob.data.ercc[c]).toSimp().round(glob.accQ);
            glob.data.assetMatrices[c] = glob.data.tickers.
                    insrow(glob.data.names).
                    insrow(glob.data.sigma[c]).
                    insrow(glob.data.var95[c]).
                    insrow(glob.data.var99[c]).
                    insrow(glob.data.er[c]).t();
        }
        
        //-----------------building asset tables-------------------
        let assetHeader = ["Ticker", glob.wideSpace + "Name" + glob.wideSpace, "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let assetAligns = ["center", "left", "right", "right", "right", "right", "right"];
        
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
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95", "VaR_99", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        glob.table.port = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
        
        //-----------------recalculator-----------------------
        let recalculator = function(matrix) {
            matrix = new Matrix(matrix);
            if (matrix.nrow() > 1) {
                let money = matrix.decap().cols(1);
                let w = money.mult(1 / money.sum()).round(glob.accShare);
                let indices = glob.data.tickers.fiof(matrix.decap().cols(0));
                let er = matrix.cols(6).decap().mult(0.01);
                let sigmacc = glob.data.sigmacc[glob.cur].t().rows(indices).mult(0.01);
                let ercc = er.plus(1).log().minus(sigmacc.sq().mult(0.5));
                let var95 = ercc.plus(sigmacc.mult(glob.alfa95)).mult(100).toSimp().round(glob.accQ);
                let var99 = ercc.plus(sigmacc.mult(glob.alfa99)).mult(100).toSimp().round(glob.accQ);
                let sigma = sigmacc.sq().exp().minus(1).sqrt().dot(er.plus(1)).mult(100).round(glob.accQ);
                matrix = matrix.plugc(w, 2).plugc(sigma, 3).plugc(var95, 4).plugc(var99, 5);
            }
            return matrix.arr;
        };
        glob.table.port.addRecalculator(recalculator);
        
        //-----------------summarizer--------------------
        let summarizer = function(matrix) {
            let total = ["TOTAL", 0, 0, 0, 0, 0, 0];
            if (matrix.length > 1) {
                matrix = new Matrix(matrix).decap();
                total[1] = matrix.cols(1).sum();
                let money = matrix.cols(1);
                let w = money.mult(1 / money.sum());
                total[2] = math.round(w.sum(), glob.accShare);
                let indices = glob.data.tickers.fiof(matrix.cols(0));
                let covcc = glob.data.covcc[glob.cur].sub(indices).mult(0.0001);
                let er = matrix.cols(6).mult(0.01);
                let cov = covcc.exp().minus(1).dot(er.plus(1).t().gram());
                total[3] = w.t().mult(cov).mult(w).sqrt().mult(100).round(glob.accQ).val();
                total[6] = w.t().mult(er).mult(100).round(glob.accEr).val();
                let sample = glob.data.sample[glob.cur].rows(indices);
                let simpRatesSample = (er.plus(1)).dot(covcc.diag().mult(-0.5).exp()).dot(sample).minus(1).mult(100);
                glob.data.portSample = w.t().mult(simpRatesSample);
                total[4] = "&#8776; " + math.round(glob.data.portSample.q(0.05),glob.accQTotal);
                total[5] = "&#8776; " + math.round(glob.data.portSample.q(0.01),glob.accQTotal);
            } else {
                glob.data.portSample = new Matrix([]);
            }
            document.dispatchEvent(new Event("summarized"));
            return total;
        };    
        glob.table.port.addSummary(summarizer, "sum", ["black", "black", "black", "black", "red", "red", "green"]);
        
        //-------------------adding inputs to port--------------------
        glob.table.port.addInput(1);
        glob.table.port.addInput(6);
        
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
            let i = glob.data.tickers.arr[0].indexOf(row[0]);
            let r = [];
            r.push(glob.data.tickers.arr[0][i]);
            r.push(glob.data.names.arr[0][i]);
            r.push(glob.data.sigma[glob.cur].arr[0][i]);
            r.push(glob.data.var95[glob.cur].arr[0][i]);
            r.push(glob.data.var99[glob.cur].arr[0][i]);
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
        
        //-------------------changing currency----------------------
        let refreshTableCur = function(table, icols) {
            if (table.matrix.length > 1) {
                let matrix = new Matrix(table.matrix);
                let indices =glob.data.tickers.fiof(matrix.decap().cols(0));
                let source = glob.data.assetMatrices[glob.cur].rows(indices).cols([2, 3, 4, 5]);
                matrix = matrix.plugc(source, icols);
                table.matrix = matrix.arr;
                table.syncTableWithMatrix();
            }
        };

        glob.html.curPick.forEach((elem) => elem.addEventListener("click", function(event) {
            glob.cur = event.target.value;
            refreshTableCur(glob.table.stockUs, [2, 3, 4, 5]);
            refreshTableCur(glob.table.stockRu, [2, 3, 4, 5]);
            refreshTableCur(glob.table.bond, [2, 3, 4, 5]);
            refreshTableCur(glob.table.commodity, [2, 3, 4, 5]);
            refreshTableCur(glob.table.etf, [2, 3, 4, 5]);
            refreshTableCur(glob.table.crypto, [2, 3, 4, 5]);
            refreshTableCur(glob.table.port, [3, 4, 5, 6]);
            glob.table.port.refreshSummary();
        }));
        
        //----------------------optimizing---------------------------       
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
                        glob.table.port.matrix = matrix.plugc(money, 1).arr;
                        glob.table.port.recalculate();
                        glob.table.port.refreshSummary();
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
                let data = makeHistogramData(glob.data.portSample.arr[0], -100, 200, 5);
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
            if (glob.table.port.matrix.length > 1) {
                glob.html.resampButton.disabled = true;
                glob.html.thinker2.style.visibility = "visible";
                window.setTimeout(function() {
                    for (let c of glob.curList) {
                        glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
                    };
                    glob.table.port.refreshSummary();
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
                if (glob.table.port.matrix.length > 1) {
                    let matrix = new Matrix(glob.table.port.matrix).decap();
                    let er = matrix.cols(6).mult(0.01);
                    let money = matrix.cols(1);
                    let w = money.mult(1 / money.sum());
                    let qcc5 = math.log(1 + glob.data.portSample.q(0.05) / 100);
                    let qcc95 = math.log(1 + glob.data.portSample.q(0.95) / 100);
                    let indices = glob.data.tickers.fiof(matrix.cols(0));
                    let sigmacc = glob.data.sigmacc[glob.cur].t().rows(indices).mult(0.01);
                    let ercc = er.plus(1).log().minus(sigmacc.sq().mult(0.5));
                    let erccAvg = ercc.t().mult(w).val();
                    let times = new Matrix(glob.chart.path.tPoints).mult(1 / glob.daysYear);
                    d = [
                        glob.chart.path.tPoints,
                        w.t().mult(er.plus(1).pow(times)).minus(1).mult(100).round(glob.chart.path.accEr).arr[0],
                        times.mult(erccAvg).plus(times.sqrt().mult(qcc5-erccAvg)).exp().minus(1).mult(100).round(glob.chart.path.accQ).arr[0],
                        times.mult(erccAvg).plus(times.sqrt().mult(qcc95-erccAvg)).exp().minus(1).mult(100).round(glob.chart.path.accQ).arr[0]
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
                        let covcc = glob.data.covcc[glob.cur].sub(indices).mult(0.0001);
                        let n = glob.chart.path.tPoints[glob.chart.path.tPoints.length - 1] / glob.chart.path.tStep;
                        let k = glob.chart.path.tStep / glob.daysYear;
                        let r = w.t().mult(covcc.sample(n).mult(math.sqrt(k)).plus(ercc.mult(k)).cumsum().exp().minus(1).mult(100)).arr[0];
                        let t = Matrix.zeros(1, n).plus(glob.chart.path.tStep).cumsum().arr[0];                        
                        d.push([0, null, null, null, null, 0, 'color: green']);
                        for (let i = 0; i < r.length; i++) {
                            if (r[i] >= 0) d.push([t[i], null, null, null, null, r[i], 'color: green']);
                            if (r[i] < 0) d.push([t[i], null, null, null, null, r[i], 'color: red']);
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
                if (glob.table.port.matrix.length > 1) {
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
