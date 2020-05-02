"use strict"
const util = require('util')
const SqlAuth = require('./classes/sql/main/SqlAuth')
const Bot = require('./classes/Bot.js')
const DiscordLog = require('./classes/helper/DiscordLog')
const Logger = require('./classes/helper/Logger')

let bots = {}

// noinspection JSUndefinedPropertyAssignment
global.getBots = function () {
  return Object.values(bots)
}
// noinspection JSUndefinedPropertyAssignment
global.getBot = function (botname) {
  return Object.values(bots).find(value => value.userName.toLowerCase() === botname.toLowerCase())
}

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

process.on('unhandledRejection', (reason, p) => {
  Logger.warn('Unhandled Rejection at promise:\n' + util.inspect(p) + '\nreason:\n' + util.inspect(reason))
})

SqlAuth.getIdList().then(ids => ids.forEach(id => {
 bots[id] = new Bot(id)
}))
