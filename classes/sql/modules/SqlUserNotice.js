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
        SUBSCRIPTION,
        SUBSCRIPTION_T2,
        SUBSCRIPTION_T3,
        SUBSCRIPTION_PRIME,
        RESUBSCRIPTION,
        RESUBSCRIPTION_T2,
        RESUBSCRIPTION_T3,
        RESUBSCRIPTION_PRIME,
        SUBSCRIPTION_GIFT,
        SUBSCRIPTION_GIFT_COMMUNITY,
        GIFT_PAID_UPGRADE,
        ANON_GIFT_PAID_UPGRADE,
        RITUAL,
        RAID
      FROM notifications
      WHERE botID = ?;
    `, botID)


    results = results.map((row) => {
      let channelID = row.channelId || ""
      let SUBSCRIPTION = row.SUBSCRIPTION
      let SUBSCRIPTION_T2 = row.SUBSCRIPTION_T2 || SUBSCRIPTION
      let SUBSCRIPTION_T3 = row.SUBSCRIPTION_T3 || SUBSCRIPTION_T2
      let SUBSCRIPTION_PRIME = row.SUBSCRIPTION_PRIME || SUBSCRIPTION

      let RESUBSCRIPTION = row.RESUBSCRIPTION
      let RESUBSCRIPTION_T2 = row.RESUBSCRIPTION_T2 || RESUBSCRIPTION
      let RESUBSCRIPTION_T3 = row.RESUBSCRIPTION_T3 || RESUBSCRIPTION_T2
      let RESUBSCRIPTION_PRIME = row.RESUBSCRIPTION_PRIME || RESUBSCRIPTION

      let SUBSCRIPTION_GIFT = row.SUBSCRIPTION_GIFT || ""
      let SUBSCRIPTION_GIFT_COMMUNITY = row.SUBSCRIPTION_GIFT_COMMUNITY || ""
      let GIFT_PAID_UPGRADE = row.GIFT_PAID_UPGRADE || ""
      let ANON_GIFT_PAID_UPGRADE = row.ANON_GIFT_PAID_UPGRADE || ""

      let RITUAL = row.RITUAL || ""
      let RAID = row.RAID || ""

      return {channelID, SUBSCRIPTION, SUBSCRIPTION_T2, SUBSCRIPTION_T3, SUBSCRIPTION_PRIME,
              RESUBSCRIPTION, RESUBSCRIPTION_T2, RESUBSCRIPTION_T3, RESUBSCRIPTION_PRIME,
              SUBSCRIPTION_GIFT, SUBSCRIPTION_GIFT_COMMUNITY, GIFT_PAID_UPGRADE, ANON_GIFT_PAID_UPGRADE,
              RITUAL, RAID}
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
