  "use strict"
const sqlPool = require('../Sql').pool


module.exports = class SqlSubNotifications {
  constructor () {

  }

  static async getNotificationData (botID) {
    let results = await sqlPool.query(`
      SELECT 
        botID,
        channelID,
        subT1,
        subT2,
        subT3,
        subPrime,
        resubT1,
        resubT2,
        resubT3,
        resubPrime,
        subGift,
        subMysteryGift,
        giftPaidUpgrade
      FROM notifications
      WHERE botID = ?;
    `, botID)


    results = results.map((row) => {
      let channelID = row.channelId || ""
      let subT1 = row.subT1 || ""
      let subT2 = row.subT2 || ""
      let subT3 = row.subT3 || ""
      let subPrime = row.resubPrime || ""
      let resubT1 = row.resubT1 || ""
      let resubT2 = row.resubT2 || ""
      let resubT3 = row.resubT3 || ""
      let resubPrime = row.resubPrime || ""
      let subGift = row.subGift || ""
      let subMysteryGift = row.subMysteryGift || ""
      let giftPaidUpgrade = row.giftPaidUpgrade || ""

      return {channelID, subT1, subT2, subT3, subPrime, resubT1, resubT2, resubT3, resubPrime, subGift, subMysteryGift, giftPaidUpgrade}
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
