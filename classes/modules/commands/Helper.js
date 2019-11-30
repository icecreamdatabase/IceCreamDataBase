"use strict"
const util = require('util')
//CLASSES
const Api = require('../../api/Api.js')
const ApiFunctions = require('../../api/ApiFunctions.js')
const DiscordLog = require('./../DiscordLog')
const Gdq = require('./../Gdq')
const Counters = require('./Counters')
const UserLevels = require("../../../ENUMS/UserLevels")

const parameterRegExp = new RegExp(/\${((?:(?!}).)*)}/, 'i')
const apiRegExp = new RegExp(/\${api=(.*?)}/, 'i')
const discordWebhookRegExp = new RegExp(/\${createNote=(?:.*\/)?([^/]*)\/([^/;]*)(?:;([^}]*))*}/, 'i')
const rndRegExp = new RegExp(/\${rnd=\(([^)]*)\)}/, 'i')

const userWasInChannelObj = {}

const icecreamFacts = {
  "Magnum Mini Almond Ice Cream Bar": "Most tasters could agree that, while the ice cream was \"creamy,\" they enjoyed the chocolate coating more. \"The crunchy milk chocolate\" has a \"hint of nuts\" which gave it good texture, according to our volunteers. Overall, the 160-calorie bar tastes as delicious as it looks.",
  "Good Humor Mounds Ice Cream Bar": "This coconut ice cream bar covered in chocolate tasted \"unique\" and had a \"fluffy yet creamy texture.\" Many tasters also enjoyed the chocolate coating and its \"wonderful taste.\" It's no surprise this dessert was a hit: It has 190 calories, the most of all the treats in our taste test.",
  "Blue Bunny Sweet Freedom No Sugar Added Raspberry and Vanilla Swirl Bar": "Our volunteers had mixed opinions about the chocolate and berry flavors in these Blue Bunny bars. While some noted the \"smooth and creamy texture,\" other tasters only liked the \"crunchy chocolate shell\" of this 70-calorie bar. Either way, all could agree this treat looked absolutely scrumptious.",
  "Skinny Cow Oh Fudge Nuts Ice Cream Cone": "The nutty flavor and \"light sprinkling of peanuts\" on this ice cream come were enjoyable to tasters. On the other hand, most agreed the \"weird texture\" hinted to its light and low-cal nature. If indulging in the 150-calorie treat, eat quickly; our tasters found the cone \"breaks easily\" on the bottom.",
  "Stonyfield Farm Nonfat After Dark Chocolate Frozen Yogurt Novelty Bar": "The combination of textures in this novelty bar makes it something special. Our volunteers thought the chocolate had a \"good crackle\" and \"didn't seem like it would shatter and fall off,\" while the ice cream was \"smooth.\" Unfortunately, some tasters could tell it was low-cal and \"not in a good way,\" with ice cream they described as \"thin\" and \"watery.\"",
  "Blue Bunny Sweet Freedom No Sugar Added Vanilla Ice Cream Cone": "After you've enjoyed its chocolate-and-peanut-toppings and the ice cream within, Blue Bunny's cones offer an extra little treat: a \"hefty amount\" of chocolate lining the inside of the cone. Many volunteers complained that the vanilla was \"more icy than creamy,\" and \"not tasty.\" At the least, you get a \"huge portion\" with only 160 calories.",
  "Edy's/Dryer's Mango Fruit Bar Review": "A good summer treat, Edy's/Dryer's Mango Fruit Bars are \"refreshing and light.\" A \"simple, straightforward\" fruit bar, our volunteers thought they seemed \"healthy\" and \"fresh and summery.\" Unfortunately, some tasters found that sugariness cloying, while others complained that the bars did \"not offer enough flavor.\"",
  "Magnum Mini Classic Ice Cream Bar": "A good ratio of vanilla to chocolate makes this \"perfect sized\" ice cream bar delicious. Yet for some tasters, their evaluation might have been swayed by a price. Some complained that the vanilla ice cream was \"bland,\" but many still felt it was a \"cute modest size.\"",
  "Good Humor York Peppermint Pattie Ice Cream Bar": "Featuring the \"taste [of] a big peppermint patty,\" Good Humor's York Peppermint Pattie Ice Cream Bar had a \"strong\" flavor, according to our volunteers. Most approved of the \"delicious chocolate shell and light texture,\" but some felt the frozen treat was too messy because it had \"no stick or anything to hold it.\"",
  "Ciao Bella Blueberry Passion Sorbet Bar": "Often referred to as \"refreshing\" by tasters, this fruit bar seemed to be a hit among most. Featuring a real fruit flavor that packed a punch, volunteers thought it \"tasted like a fruit smoothie.\" The downsides: Some tasters described the color as \"not appetizing\" and the bars melted quickly.",
  "Weight Watchers Divine Triple Chocolate Dessert Bar": "Our tasters loved the \"great flavor\" of this triple chocolate treat. With its chocolate bar filled with chocolate swirls and then coated in a chocolate shell, one volunteer declared this 110-calorie treat \"any chocolate lover's dream!\" Make sure you have napkins handy though; we found that it melts quickly and \"falls apart.\"",
  "Cadbury Vanilla Chocolate Ice Cream Bar": "Most tasters agreed that the Cadbury's chocolate coating passed the taste test but the ice cream did not. With a \"Cadbury Egg-tasting exterior\", the chocolate outside was \"rich and delicious\" and \"not fake like other products.\" The ice cream, though, had \"no distinctive flavor\" and left a \"funny aftertaste.\"",
  "Champ Snack Size Ice Cream Cones in Vanilla": "The chocolate and nuts are the real stars of these snack-size cones. Our volunteers loved the combination of textures and the \"crunchy\" cone. Unfortunately, many complained that the ice cream within was \"bland\" and \"extremely icy.\"",
  "H\u00E4agen-Dazs Snack Sized Vanilla Chocolate Cones": "Our tasters thought the nuts and chocolate of this cone were the \"perfect combination.\" Many loved the taste and \"good portion size,\" too. Volunteers were mixed on the overall sweetness however, with some loving the flavor and others calling it \"overpowering.\"",
  "Blue Bunny Premium All Natural Vanilla Ice Cream": "The \"thick and creamy\" texture of Blue Bunny All Natural Vanilla Ice Cream was well received by our volunteers. \"Sweet and milky,\" the \"good French vanilla flavor\" of this ice cream caused one taster to joke, \"Bring on the cone!\""
}

module.exports = class Helper {
  constructor () {

  }

  static splitMessageToParts (message) {
    let messageSplit = message.split(" ")
    return {command: messageSplit[0] || "", first: messageSplit[1] || "", params: messageSplit.splice(1), split: messageSplit}
  }

  static async fillParams (msgObj, commandObj) {
    let message = commandObj.response

    message = await this.handleParameter(msgObj, commandObj, message)

    return message
  }

  static async handleParameter (msgObj, commandObj, input) {
    if (input.includes("${")) {
      let message = input
      let depth = 0
      let lastDepth = 0
      let openIndex = 0
      for (let i = message.indexOf("${") + 1; i < message.length; ++i) {
        if (message.charAt(i) === "{") {
          if (depth === 0) { openIndex = i }
          depth++
        }
        if (message.charAt(i) === "}") { depth-- }
        if (lastDepth !== depth && depth === 0) {
          let match = message.substring(openIndex + 1, i)
          if (match.includes("||")) {
            let rt = await this.handleOr(msgObj, match)
            input = input.replace("${" + match + "}", rt)
          }
        }
        lastDepth = depth
      }
      input = await this.replaceParameterCommand(commandObj, input)
      input = await this.replaceParameterMessage(msgObj, input)
      input = await Counters.replaceParameter(msgObj, input)
    }
    return input
  }

  static async handleOr (msgObj, msgPart) {
    if (msgPart.includes("||")) {
      let firstParameter = msgObj.message.split(" ")[1]
      if (firstParameter !== null) {
        if (firstParameter.startsWith("@")) {
          firstParameter = firstParameter.substring(1)
        }
        return msgPart.split("||")[ await this.checkUserWasInChannel(msgObj.channel, firstParameter) ? 0 : 1]
      }
    } else {
      return msgPart
    }
  }

  static async replaceParameterCommand (commandObj, message) {
    if (commandObj.hasOwnProperty("timesUsed")) {
      message = message.replace(new RegExp("\\${timesUsed}", 'g'), commandObj.timesUsed + 1)
    }
    return message
  }

  static async replaceParameterMessage (msgObj, message) {
    if (message.includes("${rnd=(")) {
      let rndArray = message.match(rndRegExp)[1].split("|")
      let rndSelected = rndArray[Math.floor(Math.random() * rndArray.length)]

      message = message.replace(new RegExp(rndRegExp, 'g'), rndSelected)
    }

    message = message.replace(new RegExp("\\${user}", 'g'), msgObj.username)
    message = message.replace(new RegExp("\\${userNoPing}", 'g'), msgObj.username.split("").join("\u{E0000}"))
    message = message.replace(new RegExp("\\${p1}", 'g'), msgObj.message.split(" ")[1] || "")
    message = message.replace(new RegExp("\\${channel}", 'g'), msgObj.channel.substring(1))
    message = message.replace(new RegExp("\\${uptime}", 'g'), this.msToDDHHMMSS(process.uptime()))

    if (message.includes("${icecream}")) {
      let keys = Object.keys(icecreamFacts)
      let icecreamFactKey = keys[Math.floor(Math.random() * keys.length)]
      let icecreamFactContent = icecreamFacts[icecreamFactKey]
      message = message.replace(new RegExp("\\${icecream}", 'g'), icecreamFactKey + " 🍨: " + icecreamFactContent)
    }

    if (message.includes("${gdq}")) {
      message = message.replace(new RegExp("\\${gdq}", 'g'), Gdq.generateText)
    }

    if (message.includes("${api") && apiRegExp.test(message)) {
      let apiUrl = message.match(apiRegExp)[1]

      await Api.request(new URL(apiUrl)).then(response => {
        message = message.replace(new RegExp(apiRegExp, 'g'), response)
      }).catch(err => {
        message = message.replace(new RegExp(apiRegExp, 'g'), err)
      })
    }

    if (message.includes("${createNote=")) {
      let match = message.match(discordWebhookRegExp)
      let userInfo = await Api.userDataFromLogins(global.clientIdFallback, [msgObj.username])
      DiscordLog.twitchMessageManual( match[1], match[2], "",
                                      msgObj.message.slice(msgObj.message.indexOf(" ") + 1) || "No message supplied.",
                                      new Date().toISOString(),
                                      msgObj.raw.tags["color"],
                                      msgObj.username,
                                      userInfo[0].logo
                                    )
      message = message.replace(discordWebhookRegExp, match[3])
    }

    return message
  }

  static checkLastCommandUsage (commandMatch, lastCommandUsageObject, roomId, minCooldown, userLevel) {
    if (commandMatch.hasOwnProperty("cooldown") && commandMatch.hasOwnProperty("ID")) {
      let lastUsage = 0
      if (!lastCommandUsageObject.hasOwnProperty(roomId)) {
        lastCommandUsageObject[roomId] = {}
      }
      if (lastCommandUsageObject[roomId].hasOwnProperty(commandMatch.ID)) {
        lastUsage = lastCommandUsageObject[roomId][commandMatch.ID]
      }
      let cooldownPassed = Math.max(commandMatch.cooldown, minCooldown) * 1000 + lastUsage < Date.now()
        cooldownPassed = cooldownPassed || userLevel === UserLevels.BOTADMIN
      if (cooldownPassed) {
        lastCommandUsageObject[roomId][commandMatch.ID] = Date.now()
      }
      return cooldownPassed
    }
    return false
  }

  static msToDDHHMMSS (ms) {
    let secNum = parseInt(ms + "", 10) // don't forget the second param
    let days = Math.floor(secNum / 86400)
    let hours = Math.floor((secNum - (days * 86400)) / 3600)
    let minutes = Math.floor((secNum - (days * 86400) - (hours * 3600)) / 60)
    let seconds = secNum - (days * 86400) - (hours * 3600) - (minutes * 60)

    /*
    if (hours < 10) { hours = "0" + hours }
    if (minutes < 10) { minutes = "0" + minutes }
    if (seconds < 10) { seconds = "0" + seconds }
    */

    let time = seconds + 's'
    if (minutes > 0 || hours > 0) {
      time = minutes + 'm ' + time
    }
    if (hours > 0) {
      time = hours + 'h ' + time
    }
    if (days > 0) {
      time = days + 'd ' + time
    }
    return time
  }

  static async checkUserWasInChannel (channelName, userName) {
    if (channelName.charAt(0) === '#') {
      channelName = channelName.substring(1)
    }
    if (!userWasInChannelObj.hasOwnProperty(channelName)) {
      userWasInChannelObj[channelName] = new Set()
    }
    if (userWasInChannelObj[channelName].has(userName)) {
      Api.getAllUsersInChannel(channelName).then((chatters) => this.addUsersToUserWasInChannelObj(channelName, chatters))
      return true
    }
    let chatters = await Api.getAllUsersInChannel(channelName)
    this.addUsersToUserWasInChannelObj(channelName, chatters)
    return userWasInChannelObj[channelName].has(userName)
  }

  static addUsersToUserWasInChannelObj (channelName, userNames) {
    if (channelName.charAt(0) === '#') {
      channelName = channelName.substring(1)
    }
    if (!userWasInChannelObj.hasOwnProperty(channelName)) {
      userWasInChannelObj[channelName] = new Set(userNames)
    } else {
      for (let userName of userNames) {
        userWasInChannelObj[channelName].add(userName)
      }
    }
  }
}
