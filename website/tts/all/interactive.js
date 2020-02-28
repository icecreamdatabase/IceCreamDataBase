function onEnableChange (checked) {
  if (!checked) {
    document.getElementById("player").pause()
  }
}

function onVolumechange (value) {
  document.getElementById("player").volume = value
}

function onRatelimitChange (value) {
  ttsDelay = value
}

function onSayNamesChange (value) {
  sayNames = value
}

function onAlwaysFullPlaybackChange (value) {
  alwaysFullPlayback = value
}

// Will be replaced with a button on the page
window.addEventListener('load', function () {
  if (findGetParameter("lightmode")) {
    document.body.classList.add("light")
  }
})

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
    document.getElementById("tts-voice-dropdowncontent").appendChild(langNode)
    filterFunction("tts-voice-dropdownsearch", "tts-voice-dropdowncontent", document.getElementById("tts-voice-prioritycheckbox").checked)
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

function filterFunction () {
  let input = document.getElementById('tts-voice-dropdownsearch')
  let filter = input.value && input.value.toLowerCase() || ""
  let div = document.getElementById('tts-voice-dropdowncontent')
  let checkbox = document.getElementById('tts-voice-prioritycheckbox')
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

      if (checkbox.checked === true) {
        if (!a[j].classList.contains("preferred-voice")) {
          a[j].classList.add("hidden")
          continue
        }
      }

      buttonNum++
      let txtValue = a[j].textContent || a[j].innerText
      if (txtValue.toLowerCase().indexOf(filter) > -1) {
        a[j].classList.remove("hidden")
      } else {
        a[j].classList.add("hidden")
        hiddenItems++
      }
    }
    if (buttonNum === hiddenItems) {
      langDivs[i].classList.add("hidden")
    } else {
      langDivs[i].classList.remove("hidden")
    }
  }
}
