"use strict"
const sqlPool = require('../Sql').pool


module.exports = class SqlSubNotifications {
  constructor () {

  }

  /**
   * Gets all notification data for a bot
   * @param botID
   * @returns {Promise<{channelID, SUB, SUB_T2, SUB_T3, SUB_PRIME, RESUB, RESUB_T2, RESUB_T3, RESUB_PRIME, SUBGIFT, ANONSUBGIFT, SUBMYSTERYGIFT, GIFTPAIDUPGRADE, ANONGIFTPAIDUPGRADE, REWARDGIFT, RITUAL, RAID}[]>}
   */
  static async getNotificationData (botID) {
    let results = await sqlPool.query(`
        SELECT botID,
               channelID,
               SUB,
               SUB_T2,
               SUB_T3,
               SUB_PRIME,
               RESUB,
               RESUB_T2,
               RESUB_T3,
               RESUB_PRIME,
               SUBGIFT,
               ANONSUBGIFT,
               SUBMYSTERGIFT,
               GIFTPAIDUPGRADE,
               ANONGIFTPAIDUPGRADE,
               REWARDGIFT,
               RAID,
               RITUAL
        FROM notifications
        WHERE botID = ?;
    `, botID)


    results = results.map((row) => {
      let channelID = row.channelID || ""
      let SUB = row.SUB
      let SUB_T2 = row.SUB_T2 || SUB
      let SUB_T3 = row.SUB_T3 || SUB
      let SUB_PRIME = row.SUB_PRIME || SUB

      let RESUB = row.RESUB
      let RESUB_T2 = row.RESUB_T2 || RESUB
      let RESUB_T3 = row.RESUB_T3 || RESUB
      let RESUB_PRIME = row.RESUB_PRIME || RESUB

      let SUBGIFT = row.SUBGIFT || ""
      let ANONSUBGIFT = row.ANONSUBGIFT || ""
      let SUBMYSTERYGIFT = row.SUBMYSTERYGIFT || ""
      let GIFTPAIDUPGRADE = row.GIFTPAIDUPGRADE || ""
      let ANONGIFTPAIDUPGRADE = row.ANONGIFTPAIDUPGRADE || ""
      let REWARDGIFT = row.REWARDGIFT || ""

      let RAID = row.RAID || ""
      let RITUAL = row.RITUAL || ""

      return {
        channelID,
        SUB, SUB_T2, SUB_T3, SUB_PRIME,
        RESUB, RESUB_T2, RESUB_T3, RESUB_PRIME,
        SUBGIFT, ANONSUBGIFT, SUBMYSTERYGIFT,
        GIFTPAIDUPGRADE, ANONGIFTPAIDUPGRADE, REWARDGIFT,
        RITUAL, RAID
      }
    })

    //make sure the index is the channelID
    let returnData = {}
    for (let index in results) {
      if (results.hasOwnProperty(index)) {
        returnData[results[index].channelID] = results[index]
      }
    }
    return returnData
  }
}
