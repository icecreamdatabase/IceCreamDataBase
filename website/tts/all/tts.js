//default parameter
const defaultVoice = "Brian"
const defaultTtsDelay = 1000
const seVoiceFile = '../se-voices.json'
let seVoiceData = null

//get parameters out of url
let channels = (findGetParameter("channels") || "").split(",").filter(Boolean)
let singleChannel = findGetParameter("channel")
if (singleChannel) {
  channels.push(singleChannel)
}
let enabledCheckbox = document.getElementById("tts-enabled-checkbox")
let sayNames = !!findGetParameter("names")
let voice = findGetParameter("voice") || defaultVoice
let ttsDelay = parseInt(findGetParameter("ttsDelay")) || defaultTtsDelay
let alwaysFullPlayback = !!findGetParameter("alwaysFullPlayback")
let volume = parseFloat(findGetParameter("volume") || "1")
let enabled = enabledCheckbox.checked = !!findGetParameter("enabled")

//needed variables
let audioPlaying = false
let msgQueue = []
let currentMessage = []

//let rlLimit = 30
let rlRemaining = 30 // Default value of StreamElements
let rlReset = Date.now()
let rateLimited = false

buttonApplyVoice(voice)
fillVoiceDropDown(getVoices())

//apply values
document.getElementById("player").volume = volume
document.getElementById("tts-saynames-checkbox").checked = sayNames
document.getElementById("tts-alwaysfullplayback-checkbox").checked = alwaysFullPlayback
document.getElementById("tts-delay-numberfield").value = ttsDelay

//Eventlistener for TTS audio done playing
document.getElementById("player").addEventListener("ended", () => audioPlaying = false)


/* twitch-js part */
// noinspection JSUnresolvedFunction
const {api, chat} = new TwitchJs({token: "randomstring", username: "justinfan47", log: {level: "warn"}})
const sleep = (ms) => { return new Promise(resolve => setTimeout(resolve, ms)) }
const eventify = (arr, callback) => {
  arr.push = e => {
    Array.prototype.push.call(arr, e)
    callback(arr)
  }
}

chat.connect().then(() => {
  channels.forEach(channel => chat.join(channel))
  console.log("connected")
})
chat.on("PRIVMSG", (msgObj) => {
  if (!!enabledCheckbox.checked) {
    let ttsMessage = msgObj.message
    if (sayNames) {
      ttsMessage = msgObj.username + " says " + ttsMessage
    }
    console.log("TTS: " + msgObj.username + ": " + msgObj.message)
    let arr = []
    arr.push(ttsMessage)
    msgQueue.push(arr)
  }
})

eventify(msgQueue, async (arr) => {
  if (audioPlaying && alwaysFullPlayback || rateLimited) {
    return
  }

  currentMessage = arr.shift()
  let ttsMessage = currentMessage.shift()
  if (ttsMessage) {
    audioPlaying = true
    await speak(ttsMessage, voice)
  }
})

document.getElementById("player").addEventListener("ended", async () => {
  if (currentMessage.length > 0) {
    let ttsMessage = currentMessage.shift()
    await speak(ttsMessage, voice)
    return
  }

  // Delay between messages
  await sleep(parseInt(ttsDelay))

  if (msgQueue.length > 0) {
    currentMessage = msgQueue.shift()
    let ttsMessage = currentMessage.shift()
    if (ttsMessage) {
      await speak(ttsMessage, voice)
      return
    }
  }

  audioPlaying = false
})

async function speak (text, voice = "Brian") {
  if (rlRemaining <= 1) {
    if (rlReset >= Date.now()) {
      rateLimited = true
      console.log("Rate limited - waiting!")
      await sleep(Math.max(10, rlReset - Date.now()))
      rateLimited = false
    }
  }

  let response = await fetch("https://api.streamelements.com/kappa/v2/speech?voice=" +
      voice +
      "&text=" +
      encodeURIComponent(text.trim()))

  // Rate limiting headers
  //rlLimit = response.headers.get('x-ratelimit-limit')
  let newRlReset = response.headers.get('x-ratelimit-reset')
  if (newRlReset > rlReset) {
    rlReset = newRlReset
    rlRemaining = 30
  } else {
    rlRemaining = response.headers.get('x-ratelimit-remaining')
  }
  console.log(rlRemaining, rlReset, Date.now(), rlReset - Date.now())

  if (response.status === 429) {
    console.warn(await response.text())
    await speak(text, voice)
    return
  } else if (response.status !== 200) {
    console.warn(await response.text())
    audioPlaying = false
    return
  }

  let mp3 = await response.blob()

  let blobUrl = URL.createObjectURL(mp3)
  document.getElementById("source").setAttribute("src", blobUrl)
  let player = document.getElementById("player")
  player.pause()
  player.load()
  player.play()
}

function findGetParameter (parameterName) {
  let result = null
  let tmp = []
  location.search
    .substr(1)
    .split("&")
    .forEach(function (item) {
      tmp = item.split("=")
      if (tmp[0].toLowerCase() === parameterName.toLowerCase()) {
        result = decodeURIComponent(tmp[1])
      }
    })
  return result
}

function setVoice (value, noCase = false) {
  let voiceID = defaultVoice

  getVoices().some(langElem => {
    return langElem.voices.some(voiceElem => {
      let match = (noCase ? (voiceElem.id.toLowerCase() === value.toLowerCase()) : (voiceElem.id === value))

      if (match) {
        voiceID = voiceElem.id
      }

      return match
    })
  })

  voice = voiceID
}

function getVoiceLang (value, noCase = false) {
  let voiceLang = null

  getVoices().some(langElem => {
    let hasElem = langElem.voices.some(voiceElem => {
      if (noCase) {
        return (voiceElem.id.toLowerCase() === value.toLowerCase() || voiceElem.name.toLowerCase() === value.toLowerCase())
      } else {
        return (voiceElem.id === value || voiceElem.name === value)
      }
    })

    if (hasElem) {
      voiceLang = langElem.lang
    }

    return hasElem
  })

  return voiceLang
}

function getVoiceID (value, noCase = false) {
  let voiceID = null

  getVoices().some(langElem => {
    return langElem.voices.some(voiceElem => {
      let match = (noCase ?
        (voiceElem.id.toLowerCase() === value.toLowerCase() || voiceElem.name.toLowerCase() === value.toLowerCase()) :
        (voiceElem.id === value || voiceElem.name === value))

      if (match) {
        voiceID = voiceElem.id
      }

      return match
    })
  })

  return voiceID
}

function createTTSObject (message, defaultVoice = defaultVoice) {
  let output = [{voice: defaultVoice, text: ""}]
  let outputIndex = 0
  for (let word of message.split(" ")) {
    if (word.endsWith(":") && voices.includes(word.substr(0, word.length - 1))) {
      output[++outputIndex] = {}
      output[outputIndex]["voice"] = word.substr(0, word.length - 1)
      output[outputIndex]["text"] = ""
    } else {
      output[outputIndex]["text"] += " " + word
    }
  }
  output.map(x => x.text = x.text.trim())
  return output.filter(x => x.text)
}

// TODO: Load asynchronously
function getVoices () {
  if (seVoiceData === null) {
    seVoiceData = loadJSON(seVoiceFile)
    //console.log(seVoiceFile + " loaded")
  }

  return seVoiceData
}

// Load JSON text from server hosted file and return JSON parsed object
function loadJSON (filePath) {
  let json = loadTextFileAjaxSync(filePath, "application/json")
  return JSON.parse(json)
}

// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync (filePath, mimeType) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.open("GET", filePath, false)
  if (mimeType != null) {
    if (xmlHttp.overrideMimeType) {
      xmlHttp.overrideMimeType(mimeType)
    }
  }
  xmlHttp.send()
  if (xmlHttp.status === 200) {
    return xmlHttp.responseText
  } else {
    // TODO: Throw exception
    return null
  }
}
