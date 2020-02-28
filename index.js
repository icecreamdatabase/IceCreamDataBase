"use strict"
const Mysql = require('./classes/sql/main/SqlBot.js')
const Bot = require('./classes/Bot.js')
const Firehose = require('./classes/modules/Firehose')
const DiscordLog = require('./classes/modules/DiscordLog')

let bots = {}
let firehose

/*
global.VERSION.REVISION = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim()
*/

function hookStderr (callback) {
  let oldWrite = process.stderr.write

  process.stderr.write = (write => function (string, encoding, fd) {
    write.apply(process.stderr, arguments)
    callback(string, encoding, fd)
  })(process.stderr.write)

  return function () {
    process.stderr.write = oldWrite
  }
}

// noinspection JSUnusedLocalSymbols
const unhook = hookStderr((string, encoding, fd) => {
  DiscordLog.error(string)
})

Mysql.getBotData().then(async (allBotData) => {
  for (let botData of allBotData) {
    if (botData.enabled) {
      let newBot = new Bot(botData)
      bots[newBot.userId] = newBot
    }
  }
  firehose = new Firehose(bots)
})
