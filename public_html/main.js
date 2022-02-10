/* global firebase, math, google */

import {Port} from "./Port.js";
import {Matrix} from "./Matrix.js";
import {buildTables} from "./tables.js";
import {getDataFromFB} from "./data.js";
import {setCurPick} from "./pick.js";
import {setOptim} from "./optim.js";
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
        getDataFromFB(snapshot, glob);
        
        //---------building tables----------------
        buildTables(glob);
        
        //-------------------changing currency----------------------
        setCurPick(glob);
        
        //----------------------optimizing---------------------------       
        setOptim(glob);
        
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
