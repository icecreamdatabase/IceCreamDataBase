"use strict"
const sqlPool = require('../Sql').pool
const util = require('util')
const DiscordLog = require('../../../classes/modules/DiscordLog')

module.exports = class SqlPoints {
  constructor () {
  }

  static async getTopPoints (channelID, amount) {
    let results = await sqlPool.query(`
        SELECT userID, balance
        FROM pointsWallet
        WHERE channelID = ?
        ORDER BY balance desc
        LIMIT ?;
      ;`, [channelID, amount])

    return results
  }

  static setPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = VALUES(balance);
      ;`, [userID, channelID, points, points])
  }

  //https://stackoverflow.com/questions/8899802/how-do-i-do-a-bulk-insert-in-mysql-using-node-js
  static addPointsBulk (queryParams) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES ?
      ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance)
      ;`, [queryParams])
  }

  static addPoints (userID, channelID, points) {
    sqlPool.query(`
      INSERT INTO pointsWallet (userID, channelID, balance)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
          balance = balance + VALUES(balance);
      ;`, [userID, channelID, points])
  }

  static async getPoints (userID, channelID) {
    let results = await sqlPool.query(`
        SELECT balance
        FROM pointsWallet
        WHERE userID = ?
        AND channelID = ?
        ;`, [userID, channelID])

    return results[0].balance || 0
  }

  //https://dba.stackexchange.com/questions/13703/get-the-rank-of-a-user-in-a-score-table
  static async getUserInfo (userID, channelID) {
    let results = await sqlPool.query(`

        SELECT
            balance,
            1+(SELECT count(*) from pointsWallet a WHERE a.balance > b.balance AND a.channelID = ?) as 'rank',
            (SELECT count(*) FROM pointsWallet b where b.channelID = ?) AS 'total'
        FROM pointsWallet b
        WHERE b.channelID = ?
          AND b.userID = ?
        UNION ALL
        SELECT DISTINCT 0 AS balance,
                        (SELECT count(*) FROM pointsWallet WHERE channelID = ?) AS 'rank',
                        (SELECT count(*) FROM pointsWallet WHERE channelID = ?) AS 'total'
        FROM pointsWallet
        WHERE NOT EXISTS ( SELECT 1
                           FROM pointsWallet e
                           WHERE e.userID = ?
                           AND e.channelID = ?
            )
        ORDER BY rank;
        ;`, [channelID, channelID, channelID, userID, channelID, channelID, userID, channelID])

    if (results.length === 0) {
      return {balance: 0, rank: -1, total: -1}
    } else {
      return {balance: results[0].balance || 0, rank: results[0].rank || -1, total: results[0].total || -1}
    }
  }

  static async getPointsSettings () {
    let results = await sqlPool.query(`
        SELECT channelID,
               requireLive,
               intervalTime,
               intervalPoints,
               activityReqMsgPerInterval,
               activityMaxPoints,
               usernoticeSubPoints,
               usernoticeGiftPoints,
               usernoticeElsePoints,
               rouletteWinPercent,
               pointChangeReqUserLevel,
               commandTimeout,
               commandPointsEnabled,
               commandPointsCommand,
               commandPointsResponseUser,
               commandPointsResponseTarget,
               commandPointsTargetNr,
               commandTopEnabled,
               commandTopCommand,
               commandTopResponse,
               commandShootEnabled,
               commandShootCommandRegex,
               commandShootTargetNr,
               commandShootLength,
               commandShootExplanation,
               commandShootRejectPoints,
               commandShootRejectCooldown,
               commandShootCost,
               commandShootCooldown,
               commandTtsEnabled,
               commandTtsCommandBrian,
               commandTtsCommandJustin,
               commandTtsResponseAccept,
               commandTtsResponseRejectPoints,
               commandTtsResponseRejectCooldown,
               commandTtsCooldown,
               commandTtsCost,
               commandTtsReqUserLevel
        FROM pointsSettings
        WHERE enabled = b'1'
        ;`)
    let returnObj = {}
    results.forEach(x => {
      x.commandShootCommandRegexObj = new RegExp(x.commandShootCommandRegex ? x.commandShootCommandRegex : "^\\b$")
      returnObj[x.channelID] = x
    })
    return returnObj
  }
}

/*
SQL DDL:

  create table pointsWallet
  (
    userID int(11) unsigned not null,
    channelID int(11) unsigned not null,
    balance int default 0 not null,
    primary key (userID, channelID),
    constraint pointsWallet_channels_ID_fk
      foreign key (channelID) references channels (ID)
  );

  create table pointsSettings
  (
    channelID int(11) unsigned not null
      primary key,
    enabled bit default b'1' not null,
    requireLive bit default b'1' not null,
    intervalPoints int(11) unsigned null,
    intervalTime int(11) unsigned not null,
    activityMaxPoints int(11) unsigned not null,
    activityReqMsgPerInterval int(11) unsigned not null,
    usernoticeSubPoints int(11) unsigned not null,
    usernoticeGiftPoints int(11) unsigned not null,
    usernoticeElsePoints int(11) unsigned null,
    rouletteWinPercent int(11) unsigned default 45 null,
    pointChangeReqUserLevel int(11) unsigned default 3 not null,
    commandTimeout int(11) unsigned default 10 not null,
    commandPointsEnabled bit default b'1' not null,
    commandPointsCommand varchar(255) default '!points' not null,
    commandPointsResponseUser varchar(255) default '' not null,
    commandPointsResponseTarget varchar(255) default '' not null,
    commandPointsTargetNr int(11) unsigned default 1 not null,
    commandTopCommand varchar(255) default '!top' not null,
    commandTopResponse varchar(255) default '' not null,
    commandTopEnabled bit default b'1' not null,
    commandShootEnabled bit default b'0' not null,
    commandShootCommandRegex varchar(255) default '^!shoot' not null,
    commandShootTargetNr int(11) unsigned default 1 not null,
    commandShootLength int(11) unsigned default 1 not null,
    commandShootExplanation varchar(255) default '' not null,
    commandShootRejectPoints varchar(255) default '' not null,
    commandShootRejectCooldown varchar(255) default '' not null,
    commandShootCooldown int(11) unsigned default 60 not null,
    commandShootCost int(11) unsigned default 1000 not null,
    commandTtsEnabled bit default b'1' not null,
    commandTtsCommandBrian varchar(255) default '' not null,
    commandTtsCommandJustin varchar(255) default '' not null,
    commandTtsResponseAccept varchar(255) default '' not null,
    commandTtsResponseRejectPoints varchar(255) default '' not null,
    commandTtsResponseRejectCooldown varchar(225) default '' not null,
    commandTtsCooldown int(11) unsigned default 60 not null,
    commandTtsCost int(11) unsigned default 1000 not null,
    commandTtsReqUserLevel int(11) unsigned default 2 not null,
    constraint pointsSettings_channels_ID_fk
      foreign key (channelID) references channels (ID)
  );

*/
