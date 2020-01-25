/**
 * The current way of obtaining the list is getting the md-select-menu element from the AngularJS
 * app that is used when creating an overlay on the StreamElements dashboard:
 * (https://streamelements.com/dashboard/overlays)
 * Creating an alertbox and going into the TTS settings of the element should reveal a dropdown
 * menu containing all TTS voices and their respective mapping to the actual IDs that are sent to the
 * StreamElements API.
 * Using the raw HTML as file input should let you convert it to a clean json object.
 */
const SEVoiceHTMLFile = 'se-voices.html'
const SEVoiceJSONFile = 'se-voices.json'

const fs = require('fs')

// TODO: Prompt for file location
fs.readFile(SEVoiceHTMLFile, (err, html) => {
  if (err) { throw err }

  const jsdom = require('jsdom')
  const { JSDOM } = jsdom
  const { document } = (new JSDOM(html)).window
  global.document = document
  global.window = document.defaultView

  const $ = global.jQuery = require('jquery')

  const jsonObj = []

  $('md-optgroup').each((index, element) => {
    let langObj = {
      lang: $(element).children('label.md-container-ignore').text().trim(),
      voices: []
    }
    $(element).children('md-option').each((index, element) => {
      langObj.voices.push({
        id: $(element).attr('value'),
        name: $(element).children('div.md-text')
          .text()
          // Use the name in the brackets preferably if there are any since that's the name using latin symbols
          .replace(/(.+\(|\))/g, '')
          // Remove the marker for recently added voices
          .replace('NEW!', '')
          .trim()
      })
    })

    jsonObj.push(langObj)
  })

  // TODO: Prompt for file location
  fs.writeFile(SEVoiceJSONFile, JSON.stringify(jsonObj, null, '\t'), (err) => {
    if (err) { throw err }

    console.log('json data created!')
  })
})