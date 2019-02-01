const mysql = require('mysql2')
const util = require('util')
const options = require('./config.json')

//cast bit(1) to boolean
//https://www.bennadel.com/blog/3188-casting-bit-fields-to-booleans-using-the-node-js-mysql-driver.htm
options.mysqloptions.typeCast = function castField ( field, useDefaultTypeCasting ) {
  // We only want to cast bit fields that have a single-bit in them. If the field
  // has more than one bit, then we cannot assume it is supposed to be a Boolean.
  if ( ( field.type === "BIT" ) && ( field.length === 1 ) ) {
    var bytes = field.buffer()
    //Account for the (hopefully rare) case in which a BIT(1) field would be NULL
    if (bytes === null) {
      return null
    }
    // A Buffer in Node represents a collection of 8-bit unsigned integers.
    // Therefore, our single "bit field" comes back as the bits '0000 0001',
    // which is equivalent to the number 1.
    return ( bytes[ 0 ] === 1 )
  }
  return ( useDefaultTypeCasting() )
}

var pool = mysql.createPool(options.mysqloptions)

pool.query = util.promisify(pool.query) // Magic happens here.
pool.execute = util.promisify(pool.execute) // Magic happens here.

module.exports = {
  /*pool,*/
  getBotData,
  getChannelData
}

async function getBotData () {
  let results = await pool.query("SELECT * FROM bots order by ID asc;")

  return results.map((row) => {
    let dbID = row.ID || -1
    let username = row.username || ""
    let token = row.password || ""
    let clientID = row.krakenClientId || ""
    let enabled = row.enabled || false
    let isKnown = row.knownBot || false
    let isVerified = row.verifiedBot || false

    return {dbID, username, token, clientID, chat: {isKnown, isVerified}, enabled}
  })
}

async function getChannelData (botINDEX) {
  let results = await pool.query(`SELECT botID, channelID, channelName, channels.enabled, shouldModerate, useLocalCommands, useGlobalCommands, useHardcodedCommands
  FROM bots, channels, connections
  WHERE bots.ID = botID
  AND channels.ID = channelID
  AND bots.ID = ?`, botINDEX)

  return results.map((row) => {
    let botID = row.botID || -1
    let channelID = row.channelID || -1
    let channelName = row.channelName || -1
    let enabled = row.enabled || false
    let shouldModerate = row.shouldModerate || false
    let useLocalCommands = row.useLocalCommands || false
    let useGlobalCommands = row.useGlobalCommands || false
    let useHardcodedCommands = row.useHardcodedCommands || false

    return {botID, channelID, channelName, enabled, shouldModerate, useLocalCommands, useGlobalCommands, useHardcodedCommands}
  })
}
