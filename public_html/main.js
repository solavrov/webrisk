/* global firebase, math, google */

import {Matrix} from "./Matrix.js";
import {buildTables} from "./tables.js";
import {getDataFromFB} from "./data.js";
import {setCurPick, setSampPick} from "./pick.js";
import {setOptim} from "./optim.js";
import {setSampleRefresh} from "./sample.js";
import {buildDistChart} from "./distChart.js";
import {buildPathChart} from "./pathChart.js";

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
glob.wideSpace = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
glob.accEr = 2;
glob.accQ = 2;
glob.accQTotal = 0;
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
glob.data.med = {};
glob.data.up95 = {};
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
glob.html.sampPick = document.getElementsByName("sampPick");
//glob.html.thinker3 = document.getElementById("thinker3");

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
        getDataFromFB(snapshot, glob);
        buildTables(glob);
        setCurPick(glob);
        setOptim(glob);
        buildDistChart(glob);
        setSampleRefresh(glob);
        //setSampPick(glob);
        buildPathChart(glob);
    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
