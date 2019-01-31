#!/usr/bin/env node

const csv=require('csvtojson');
const moment=require('moment');

const filepath = process.env.FILEPATH || process.env.PWD;
const inputFileName = process.env.INPUTFILENAME || 'dam.csv';
const outputFileName = process.env.OUTPUTFILENAME || 'results.txt'


class PriceScheme {
  constructor() {
    this.batteryState = 0;//hours of charge
    this.money = 0; // 
    this.currHour = 0
    this.batteryLim = 1;//hours
    this.data = [];
    this.log = [];
  }
  import(){
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
    console.log('smart algorithm returns', this.findNextMax(this.data, 0));
    console.log('log', this.log);
    // console.log(this.calcProfit());

  }
  findNextMax(data, i){
    while (i < data.length && !this.isMax(data, i)) {
      i++
    }
    console.log(data, i);
    data = this.sell(data, i);
    i += 1;
    console.log(data, i);
    if (i < data.length) {
      console.log('find next min block')
      return this.findNextMin(data, i);
    } else {
      return data;
      console.log(data, this.log)
      // how to trigger next loop?
    }
  }
  findNextMin(data, i){
    console.log('findNextMin', data, i)
    while (i < data.length && !this.isMin(data, i)) {
      this.hold(data, i);
      i++
    }
    data = this.buy(data, i);
    i += 1;
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
      price: data[i].price * -1
    })
    data.splice(i, 0);
    return data;
  }
  sell(data, i){
    this.log.push({
      transaction: 'sell',
      price: data[i].price
    });
    data.splice(i, 0)
    return data;
  }
  hold(data, i){
    return data.splice(i, 0);
  }
  calcProfit(){
    return this.log.reduce(prev, next => prev.price + next.price)
  }
  decide(){
    // console.log(this.currHour);
    const price = this.data[this.currHour].price;
    const nextPrice = this.data[this.currHour + 1] ? this.data[this.currHour + 1].price : 0;
    if (price > nextPrice && this.batteryState > 0) {
      this.sell();
    } else if (price < nextPrice && this.batteryState < this.batteryLim) {
      this.buy();
    }

    if (this.currHour < this.data.length-1) {
      this.currHour += 1;
      this.decide();
    } else {
      // console.log(this.data)
      console.log(this.money)
      console.log(this.batteryState)
    }
  }

}

const priceScheme = new PriceScheme;
priceScheme.import();
// priceScheme.decide();

// situations -

