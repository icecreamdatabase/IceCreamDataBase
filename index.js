"use strict";
const Mysql = require('./classes/Sql.js')
const Bot = require('./classes/Bot.js')
const Logger = require('consola')

var bots = {}
const logSetting = {log: { level: 2 }}
const UPDATE_ALL_CHANNELS_INTERVAL = 15000 //ms

/*
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};
*/

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
  Logger.info("Bot setup done")
})
