#!/usr/bin/env node

const csv=require('csvtojson');
const moment=require('moment');

const filepath = process.env.FILEPATH || process.env.PWD;
const inputFileName = process.env.INPUTFILENAME || 'dam.csv';
const outputFileName = process.env.OUTPUTFILENAME || 'results.txt';

// Todo: Reorganize into different objects, use scoping rather than passing variables. Maybe a battery object, or an hour-of-battery-capacity object?
// Visualize!
// Figure out how to do cash flow vs. profit - the energy in the battery has some value that you neglect with a purely cashflow analysis (as I'm doing)
// Function to make a continuous function (from day-ahead-market) FIRST: Look at EIM prices and see if there are easy patterns to see. 
// Function to pick from continuous function to make buy/sell on interals in another market (5 min Energy Imbalance Market).
// Easy: Reserve 30-60 min capacity for EIM trading. Hard: Dynamically decide if one is likely to be more profitable than the other. 

/* Possible constraints:
1. Committments to future buy/sell. When do I decide what I'm going to do on the DAM?
2. C rate. If I'm maxed out selling or buying on the DAM I presumably can't do the same action on the 15 min markets.
  b. You can commit to buy into one and sell into the other, no physical asset needed. This forces the prices to converge. 
Approaches: I can reserve some portion for each market, and test the different reserves. 
I can make a plan and shift when I buy?


*/

/* Glossary

See http://www.caiso.com/market/Pages/MarketProcesses.aspx and http://www.caiso.com/Pages/glossary.aspx

LMP - Location Marginal Pricer
FMM - Fifteen Minute Market
RTD - Real-time Dispatch (5 min market?)
HASP - Hour ahead scheduleing process. . 
AS - Ancillary Services
*/


class PriceScheme {
  constructor() {
    this.initialBatteryState = 0;//hours of charge
    this.initialMoney = 0; // 
    this.batteryLim = 6; //hours
    this.data = [];
    this.log = [];
    this.marginalCashFlow = []
  }
  import(){
    debugger;
    console.log(process.env.FILEPATH)
    console.log(`${filepath}/${inputFileName}`)
    csv()
      .fromFile(`${filepath}/${inputFileName}`)
      .then((jsonObj)=>{ 
        this.formatImport(jsonObj);
    })
  }
  formatImport(jsonObj) {
    const energyPrice = jsonObj.filter((hour) => {
      return hour.XML_DATA_ITEM === 'LMP_ENE_PRC'
    })
    const simplified = energyPrice.map((hour, index) => {
      const startTime = moment(hour.INTERVALSTARTTIME_GMT);
      const endTime = moment(hour.INTERVALENDTIME_GMT);
      return {
        operatingHour: parseInt(hour.OPR_HR),
        startTime: startTime.toObject(),
        endTime: endTime.toObject(),
        price: parseFloat(hour.MW),
        duration: moment.duration(endTime.diff(startTime)).as("minutes")
      }
    });
    this.data = simplified.sort((prev, curr) => prev.operatingHour - curr.operatingHour);

    priceScheme.plan();
    console.log(priceScheme.calcAccountBalance())
    console.log(priceScheme.calcStateOfCharge())
  }
  plan(){ 
    let data = this.data;
    // Sell first action - energy in battery
    for (let i = 0; i < this.initialBatteryState; i++) {
      const marginalHour = i
      data = this.findNextMax(data, 0, marginalHour);
      this.marginalCashFlow.push({
        value: this.calcAccountBalance(marginalHour),
        firstMove: 'sell'
      })
    }
    // Buy first action - spare capacity in battery
    for (let i = 0; i < this.batteryLim - this.initialBatteryState; i++) {
      const marginalHour = i + this.initialBatteryState;
      data = this.findNextMin(data, 0, marginalHour);
      this.marginalCashFlow.push({
        value: this.calcAccountBalance(marginalHour),
        firstMove: 'buy'
      })
    }

  }
  findNextMax(data, i, marginalHour){
    while (i < data.length && !this.isMax(data, i)) {
      i++
    }
    this.sell(data[i], marginalHour);
    // remove record from data
    data.splice(i, 1);
    if (i < data.length) {
      return this.findNextMin(data, i, marginalHour);
    } else {
      return data;
    }
  }
  findNextMin(data, i, marginalHour){
    while (i < data.length && !this.isMin(data, i)) {
      i++
    }
    this.buy(data[i], marginalHour);
    // remove record from data
    data.splice(i, 1);
    if (i < data.length) {
      return this.findNextMax(data, i, marginalHour);
    } else {
      return data;
    }
  }
  isMax(data, i) {
    const prevPrice = (i - 1 >= 0) ? data[i - 1].price : 0
    const price = data[i].price
    const nextPrice = (i + 1 < data.length) ? data[i + 1].price : 0;
    return price > prevPrice && price > nextPrice;
  }
  isMin(data, i) {
    const prevPrice = (i - 1 >= 0) ? data[i - 1].price : Infinity
    const price = data[i].price
    const nextPrice = (i + 1 < data.length) ? data[i + 1].price : Infinity;
    return price < prevPrice && price < nextPrice;
  }
  buy(hour, marginalHour){
    if (!hour) {
      debugger;
    }
    this.log.push({
      transaction: 'buy',
      price: hour.price,
      operatingHour: hour.operatingHour,
      marginalHour: marginalHour
    });
  }
  sell(hour, marginalHour){
    if (!hour) {
      debugger;
    }
    this.log.push({
      transaction: 'sell',
      price: hour.price * -1,
      operatingHour: hour.operatingHour,
      marginalHour: marginalHour
    });
  }
  calcAccountBalance(marginalHour){
    const filtered = this.log.filter( hour => marginalHour === undefined || hour.marginalHour === marginalHour)
    const prices = filtered.map( hour => hour.price);
    return -1 * prices.reduce((accumulator, curr) => {
      return accumulator + curr})
  }
  calcStateOfCharge(){
    const sorted = this.log.sort((prev, curr) => prev.operatingHour - curr.operatingHour);
    const mapped = sorted.map(hour => {
      if (hour.transaction === 'buy') {
        return 1
      } else if (hour.transaction === 'sell') {
        return -1
      }
    });
    return mapped.reduce((accumulator, curr, index)=> {
      const sum = accumulator + curr;
      if (sum < 0 || sum > this.batteryLim) {
        console.warn(`state of charge out of bounds. Value of ${sum} at index ${this.log[index].index} and operating hour ${this.log[index].operatingHour}`);
      }
      return sum
    }, this.initialBatteryState);
  }

}

const priceScheme = new PriceScheme;
priceScheme.import();


// situations -

