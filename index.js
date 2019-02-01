#!/usr/bin/env node

const csv=require('csvtojson');
const moment=require('moment');

const filepath = process.env.FILEPATH || process.env.PWD;
const inputFileName = process.env.INPUTFILENAME || 'dam.csv';
const outputFileName = process.env.OUTPUTFILENAME || 'results.txt';


class PriceScheme {
  constructor() {
    this.initialBatteryState = 3;//hours of charge
    this.initialMoney = 0; // 
    this.batteryLim = 3; //hours
    this.data = [];
    this.log = [];
  }
  import(){
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
    // Here I'll need to replace the logic wtih 
    // this.findNextMin(this.data, 0);
    // console.log('log', this.log);
    // console.log('AccountBalance', this.calcAccountBalance());
    // console.log('ending State of Charge', this.calcStateOfCharge());
    priceScheme.plan();
    console.log(priceScheme.calcAccountBalance())
    console.log(priceScheme.calcStateOfCharge())
  }
  plan(){ 
    let data = this.data;
    // Buy first action - spare capacity in battery
    for (let i = 0; i < this.batteryLim - this.initialBatteryState; i++) {
      data = this.findNextMin(data, 0);
    }
    // Sell first action - energy in battery
    for (let i = 0; i < this.initialBatteryState; i++) {
      data = this.findNextMax(data, 0);
    }
  }
  findNextMax(data, i){
    while (i < data.length && !this.isMax(data, i)) {
      i++
    }
    data = this.sell(data, i);
    if (i < data.length) {
      return this.findNextMin(data, i);
    } else {
      return data;
    }
  }
  findNextMin(data, i){
    while (i < data.length && !this.isMin(data, i)) {
      this.hold(data, i);
      i++
    }
    data = this.buy(data, i);
    if (i < data.length) {
      return this.findNextMax(data, i);
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
  buy(data, i){
    this.log.push({
      transaction: 'buy',
      price: data[i].price,
      operatingHour: data[i].operatingHour
    })
    data.splice(i, 1);
    return data;
  }
  sell(data, i){
    this.log.push({
      transaction: 'sell',
      price: data[i].price * -1,
      operatingHour: data[i].operatingHour
    });
    data.splice(i, 1)
    return data;
  }
  hold(data, i){
    return data.splice(i, 0);
  }
  calcAccountBalance(){
    return -1 * this.log.map(hour => hour.price).reduce((accumulator, curr) => {
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

