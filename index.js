"use strict"
const Mysql = require('./classes/Sql.js')
const Bot = require('./classes/Bot.js')
const Logger = require('consola')

var bots = {}

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
  return Promise.resolve(1)
})
