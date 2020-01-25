function onEnableChange (checked) {
  if (!checked) {
    document.getElementById("player").pause()
  }
}

function onVolumechange (value) {
  document.getElementById("player").volume = value
}

function onRatelimitChange (value) {
  ttsRatelimit = value
}

function onSayNamesChange (value) {
  sayNames = value
}

function onAlwaysFullPlaybackChange (value) {
  alwaysFullPlayback = value
}

function fillVoiceDropDown (voices) {
  // clone to not manipulate original
  voices = voices.slice(0)

  let filter = /^((US|British)\s)?English$/g
  let preferredVoices = ["Aditi", "Amy", "Astrid", "Bianca", "Brian", "Carla", "Carmen", "Celine", "Chantal", "Conchita", "Cristiano", "Dora", "Emma", "Enrique", "Ewa", "Filiz", "Geraint", "Giorgio", "Gwyneth", "Hans", "Ines", "Ivy", "Jacek", "Jan", "Joanna", "Joey", "Justin", "Karl", "Kendra", "Kimberly", "Liv", "Lotte", "Mads", "Maja", "Marlene", "Mathieu", "Matthew", "Maxim", "Mia", "Miguel", "Mizuki", "Naja", "Nicole", "Penelope", "Raveena", "Ricardo", "Ruben", "Russell", "Salli", "Seoyeon", "Takumi", "Tatyana", "Vicki", "Vitoria", "Zhiyu"]

  voices.sort((a, b) => a.lang.localeCompare(b.lang, 'en-US', {sensitivity: 'accent'}))
  // Put filter match on top
  voices.sort((a, b) => {
    let m = a.lang.search(filter) !== -1
    let n = b.lang.search(filter) !== -1
    return (!m && n ? 1 : 0) || (m && !n ? -1 : 0)
  })
  voices.forEach(e => {
    e.voices.sort((a, b) => a.name.localeCompare(b.name, 'en-US', {sensitivity: 'accent'}))
    //e.voices.filter(x => preferredVoices.includes(x.id)).map(x => { x.name += '*' })
  })

  voices.forEach(langElem => {
    let langNode = document.createElement("div")
    let langLabel = document.createElement("label")
    langLabel.appendChild(document.createTextNode(langElem.lang))
    if (langElem.lang.search(filter) !== -1) {
      langLabel.classList.add("preferred-lang")
    }
    langNode.appendChild(langLabel)
    langElem.voices.forEach(voiceElem => {
      let buttonNode = document.createElement("button")
      buttonNode.setAttribute("onclick", "buttonApplyVoice('" + voiceElem.id + "', '" + voiceElem.name + "')")
      // Add class to preferred voices
      if (preferredVoices.includes(voiceElem.id)) {
        buttonNode.classList.add("preferred-voice")
      }
      buttonNode.appendChild(document.createTextNode(voiceElem.name + (preferredVoices.includes(voiceElem.id) ? "*" : "")))
      langNode.appendChild(buttonNode)
    })
    document.getElementById("tts-voice-dropdowndiv").appendChild(langNode)
    filterFunction("tts-voice-dropdowndiv", "tts-voice-dropdowndiv", document.getElementById("tts-voice-prioritycheckbox").checked)
  })
}

function buttonApplyVoice (id, name = null) {
  setVoice(id, true)
  document.getElementById('tts-voice-dropdownbutton').textContent = name || id
  document.getElementById('tts-voice-dropdownbutton').click()
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show", false)
}

function toggleVoiceDropdown () {
  document.getElementById("tts-voice-dropdowndiv").classList.toggle("show")
}

function filterFunction (dropDownSearch, dropDownDiv, asterisk = false) {
  let input = document.getElementById(dropDownSearch)
  let filter = input.value && input.value.toLowerCase() || ""
  let div = document.getElementById(dropDownDiv)
  let langDivs = div.children
  for (let i = 0; i < langDivs.length; i++) {
    if (langDivs[i].tagName.toLowerCase() !== "div") {
      continue
    }

    let a = langDivs[i].children
    let buttonNum = 0
    let hiddenItems = 0
    for (let j = 0; j < a.length; j++) {
      if (a[j].tagName.toLowerCase() !== "button") {
        continue
      }

      if (asterisk === true) {
        if (!a[j].classList.contains("preferred-voice")) {
          a[j].style.display = "none"
          continue
        }
      }
      console.log(asterisk)

      buttonNum++
      let txtValue = a[j].textContent || a[j].innerText
      if (txtValue.toLowerCase().indexOf(filter) > -1) {
        a[j].style.display = ""
      } else {
        a[j].style.display = "none"
        hiddenItems++
      }
    }
    if (buttonNum === hiddenItems) {
      langDivs[i].style.display = "none"
    } else {
      langDivs[i].style.display = ""
    }
  }
}
