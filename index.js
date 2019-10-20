"use strict"
const Mysql = require('./classes/sql/main/SqlBot.js')
const Bot = require('./classes/Bot.js')
const Firehose = require('./classes/modules/Firehose')
const Points = require('./classes/modules/Points')

let bots = {}
let firehose
let points

/*
global.VERSION.REVISION = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim()
*/


Mysql.getBotData().then(async (allBotData) => {
  for (let botData of allBotData) {
    if (botData.enabled) {
      let newBot = new Bot(botData)
      bots[newBot.userId] = newBot
    }
  }
  firehose = new Firehose(bots)
  points = new Points()
})
