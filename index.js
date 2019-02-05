const TwitchJs = require('twitch-js').default
const Mysql = require('./sql.js')
const OnX = require('./onX.js')
const Api = require('./api.js')
const Sender = require('./send.js')
const Logger = require('consola')
const UserLevels = require('./ENUMS/UserLevels.js')

global.bots = {}
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

async function botSetup () {
  await Mysql.getBotData().then(async (allBotData) => {
    for (let botData of allBotData) {
      if (botData.enabled) {
        Logger.info("Setting up bot: " + botData.username + " (" + botData.userId + ")")
        //add log settings
        Object.assign(botData, logSetting)
        //create bot
        let {api, chat, chatConstants} = new TwitchJs(botData)
        //save bot to object
        bots[botData.userId] = {api, chat, chatConstants}
        //add botData
        bots[botData.userId].chat.botData = botData
        //create empty channel array
        bots[botData.userId].chat.channels = {}

        bots[botData.userId].chat.botData.userId = await Api.userIdFromLogin(bots[botData.userId], bots[botData.userId].chat.botData.username)

        //Connecting the bot to the twich servers
        Logger.info("Connecting...")
        await bots[botData.userId].chat.connect().then(() => {
          Logger.info("Connected!")
        }).catch(() => {
          Logger.info("AAAAAAAAAAAAAAAAA Something went wrong")
        })
      }
    }
    return Promise.resolve(1)
  })
}

async function updateBotChannel (bot) {
  return new Promise((resolve) => {
    Mysql.getChannelData(bot.chat.botData.userId).then(async (allChannelData) => {
      //remove unused channels
      for (let channelId in bot.chat.channels) {
        //check
        let contains = false
        for (let channelIndex in allChannelData) {
          if (allChannelData[channelIndex].channelID === bot.chat.channels[channelId].channelID) {
            contains = true
          }
        }
        //part
        if (!contains) {
          bot.chat.part(allChannelData[channelId].channelName)
          Logger.info(bot.chat.botData.username + " Parted: #" + allChannelData[channelId].channelName)
        }
      }
      //add new channels
      for (let channelId in allChannelData) {
        //check
        let contains = false
        for (let currentChannelId in bot.chat.channels) {
          if (bot.chat.channels[currentChannelId].channelID === allChannelData[channelId].channelID) {
            contains = true
          }
        }
        //join
        if (!contains) {
          Logger.info(bot.chat.botData.username + " Joining: #" + allChannelData[channelId].channelName)
          await bot.chat.join(allChannelData[channelId].channelName).then(() => {
            Logger.info(bot.chat.botData.username + " Joined: #" + allChannelData[channelId].channelName)
            allChannelData[channelId].alreadyConnected = true
          }).catch((msg) => { Logger.error("JOIN: " + msg) })
          //allChannelData[channelId].botStatus = UserLevels.PLEB
        }
      }
      //save changes to bot array
      bots[bot.chat.botData.userId].chat.channels = allChannelData
      //Update the knowledge about the mod / vip status of all bots
      Api.updateBotStatus()
      //resolve the Promise
      resolve()
    })
  })
}

async function updateAllChannels () {
  //run through bot object and update the bots channels
  return Promise.all(Object.values(bots).map(updateBotChannel))
}


/* MAIN START */

botSetup().then(() => {
  Logger.info("Bot setup done")
  updateAllChannels().then(() => {
    Logger.info("First time channel joining done")
    setInterval(updateAllChannels, UPDATE_ALL_CHANNELS_INTERVAL)
    for (i in bots) {
      bots[i].chat.on('PRIVMSG', OnX.onChat)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION', OnX.onSubscription)
      bots[i].chat.on('USERNOTICE/RESUBSCRIPTION', OnX.onResubscription)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION_GIFT', OnX.onSubscriptionGift)
      bots[i].chat.on('USERNOTICE/SUBSCRIPTION_GIFT_COMMUNITY', OnX.onSubscriptionGiftCommunity)
      bots[i].chat.on('USERNOTICE/GIFT_PAID_UPGRADE', OnX.onGiftPaidUpgrade)
      bots[i].chat.on('USERNOTICE/ANON_GIFT_PAID_UPGRADE', OnX.onAnonGiftPaidUpgrade)
      bots[i].chat.on('USERNOTICE/RITUAL', OnX.onRitual)
      bots[i].chat.on('USERNOTICE/RAID', OnX.onRaid)

      bots[i].chat.sayQueue = Sender.sayQueue

      Logger.info("Bot: " + i)
      Logger.info("Channels: " + Object.keys(bots[i].chat.channels))
    }
  })
})
