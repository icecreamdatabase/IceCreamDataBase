"use strict"

const axios = require('axios')
const CancelToken = axios.CancelToken
//CLASSES
const DiscordLog = require('./DiscordLog')
//ENUMS
const ChatLimit = require('./../../ENUMS/ChatLimit.js')

const nameRegex = /\bicdb\b/i

module.exports = class Firehose {
  constructor (bots) {
    this.lastLine = 0
    this.req = null
    this.bots = bots
    this.source = CancelToken.source()
    //TODO: don't use timeouts ...
    setTimeout(this.checkFirehose.bind(this), 5000)
  }

  checkFirehose () {
    if (this.lastLine + 5000 < new Date()) {
      if (this.req) {
        this.source.cancel()
        this.req = null
      }
      this.startFirehose()
    }
    setTimeout(this.checkFirehose.bind(this), 10000)
  }

  startFirehose () {
    let verifiedBot = (Object.values(this.bots)).find(x => x.rateLimitUser === ChatLimit.VERIFIED)
    if (verifiedBot) {
      let request = {
        url: "https://tmi.twitch.tv/firehose?oauth_token="
          + verifiedBot.TwitchIRCConnection.botData.token.substring(6),
        responseType: 'stream'
        }

      console.log("Starting firehose")
      this.req = axios(request, {cancelToken: this.source.token}).then((res) => {
        res.data.on('data', (response) => {
          try {
            this.lastLine = Date.now()

            let obj = JSON.parse(response.toString().split("\n")[1].substring(6))
            //obj.event = split[0].substring(7)
            //TODO: move the parameters somewhere else
            if (nameRegex.test(obj.body)) {

              let tags = obj.tags.split(";")
              let parsedtags = {}
              for (let tag of tags) {
                let split = tag.split("=")
                parsedtags[split[0]] = split[1]
              }

              if (obj.room) {
                DiscordLog.twitchMessageCustom("firehose-notify", obj.room, obj.body, new Date().toISOString(), parsedtags.color, obj.nick, "")
              } else {
                DiscordLog.custom("firehose-notify",
                  response.toString().split("\n")[0].substring(7),
                  util.inspect(obj))
              }
            }
            // eslint-disable-next-line no-empty
          } catch (e) {
            //DiscordLog.error(e)
          }
        })
      }).catch((err) => {
        if (axios.isCancel(err)) {
          console.log("Firehose canceled ...")
        } else {
          this.source.cancel()
        }
      })
    }
  }
}

