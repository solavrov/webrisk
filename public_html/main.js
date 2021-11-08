/* global firebase, math */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {indexOf, allIndices, getCol, getRows, insert, contToSimp} from "./funs.js";

const DAYS_IN_YEAR = 250;
const ALFA_95 = -1.645;
const ALFA_99 = -2.326;
const ACCURACY = 1;
const CURRENCIES = ['rub', 'usd', 'eur'];

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

dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        loader.style.visibility = "hidden";
        body.style.visibility = "visible";

        //getting data
        updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
        let tickers = snapshot.child("tickers").val();
        let types = snapshot.child("types").val();
        let names = snapshot.child("names").val();
        let er = {};
        let cov = {};
        let sigma = {};
        let var95 = {};
        let var99 = {};
        let assetMatrices = {};
        for (let c of CURRENCIES) {
            er[c] = math.round(snapshot.child("er_" + c).val(), ACCURACY);
            cov[c] = math.multiply(snapshot.child("cov_" + c).val(), DAYS_IN_YEAR);
            sigma[c] = math.round(math.sqrt(math.diag(cov[c])), ACCURACY);
            var95[c] = math.round(contToSimp(math.add(er[c], math.multiply(sigma[c], ALFA_95))), ACCURACY);
            var99[c] = math.round(contToSimp(math.add(er[c], math.multiply(sigma[c], ALFA_99))), ACCURACY);
            assetMatrices[c] = math.transpose([tickers, names, sigma[c], var95[c], var99[c], er[c]]);
        }
        let cur = 'rub';
        
        //building asset tables
        let assetHeader = ["Ticker", "Name", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let assetAligns = ["center", "left", "right", "right", "right", "right", "right"];
        
        let stockUsTable = new SideTable(assetHeader, "us_stocks", "linked", assetAligns, "US Stocks");
        stockUsTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "stock_us")));

        let stockRuTable = new SideTable(assetHeader, "ru_stocks", "linked", assetAligns, "RU Stocks");
        stockRuTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "stock_ru")));
        
        let bondTable = new SideTable(assetHeader, "bonds", "linked", assetAligns, "Bonds");
        bondTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "bond")));

        let commodityTable = new SideTable(assetHeader, "commodities", "linked", assetAligns, "Commodities");
        commodityTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "commodity")));
        
        let etfTable = new SideTable(assetHeader, "etfs", "linked", assetAligns, "ETFs");
        etfTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "etf")));
        
        let cryptoTable = new SideTable(assetHeader, "crypto", "linked", assetAligns, "Crypto");
        cryptoTable.appendMatrix(getRows(assetMatrices[cur], allIndices(types, "crypto")));
        
        //building port table
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
        let recalculator = function(m) {
            if (m.length > 1) {
                let c = math.subset(m, math.index(math.range(1, m.length), 1));
                let c2 = math.round(math.multiply(c, 1 / math.sum(c)), 3);
                m = math.subset(m, math.index(math.range(1, m.length), 2), c2);
            }
            return m;
        }; 
        portTable.addRecalculator(recalculator);
        let summarizer = function(m) {
            //["Ticker", "Money", "Share", "Volatility", "VaR_95%", "VaR_99%", "Expected return"]
            let s1 = 0;
            let s2 = 0;
            let s3 = 0;
            let s4 = 0;
            let s5 = 0;
            let s6 = 0;
            if (m.length > 1) {
                m.shift();
                s1 = math.sum(math.column(m, 1));
                let w = math.column(m, 2);
                s2 = math.round(math.sum(w), 1);
                let i = indexOf(tickers, getCol(m, 0));
                let subcov = math.subset(cov[cur], math.index(i, i));
                s3 = math.round(math.sum(math.sqrt(math.multiply(math.transpose(w), subcov, w))), ACCURACY);
                s6 = math.round(math.sum(math.multiply(math.transpose(w), math.column(m, 6))), ACCURACY);
                s4 = math.round(contToSimp(ALFA_95 * s3 + s6), ACCURACY);
                s5 = math.round(contToSimp(ALFA_99 * s3 + s6), ACCURACY);
            }
            return ["TOTAL", s1, s2, s3, s4, s5, s6];
        };    
        portTable.addSummary(summarizer);
        portTable.addInput(1);
        
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
            let i = tickers.indexOf(row[0]);
            let r = [];
            r.push(tickers[i]);
            r.push(names[i]);
            r.push(sigma[cur][i]);
            r.push(var95[cur][i]);
            r.push(var99[cur][i]);
            r.push(er[cur][i]);
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
            let jFrom = indexOf(tickers, getCol(table.matrix, 0));
            jFrom.shift();
            if (jFrom.length > 0) {
                let iFrom = [2, 3, 4, 5];
                let jTo = math.range(1, table.matrix.length);
                table.matrix = insert(assetMatrices[cur], table.matrix, math.index(jFrom, iFrom), math.index(jTo, iTo));
                table.syncTableWithMatrix();
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

        






    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
