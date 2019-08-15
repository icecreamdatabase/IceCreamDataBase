"use strict"
const util = require('util')

module.exports = class SqlCommands {
  constructor () {
  }

  static resultDataFromResults (results, resultsRegex) {

    let returnData = {"normal": {}, "regex": {}}

    //TODO: is this even needed? ... only the regExp part is really .... I never access directly

    for (let index in results) {
      if (results.hasOwnProperty(index) && results[index].hasOwnProperty("command")) {
        returnData.normal[results[index].command] = results[index]
      }
    }

    for (let index in resultsRegex) {
      if (resultsRegex.hasOwnProperty(index) && resultsRegex[index].hasOwnProperty("command")) {
        resultsRegex[index].regExp = new RegExp(resultsRegex[index].command, "i")
        returnData.regex[resultsRegex[index].command] = resultsRegex[index]
      }
    }

    return returnData
  }
}
