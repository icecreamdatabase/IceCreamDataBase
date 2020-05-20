"use strict"
const Logger = require('../../helper/Logger')

/*
  This entire file is pretty much taken from here:
  https://taskinoz.com/gdq/js/script.js
 */
class Gdq {
  constructor () {
  }

  //Random Function (so I dont have to typle a Math.random every time)
  /**
   * Random function so one does not have to type Math.random every time
   * @param r max random value
   * @returns {number} Int random
   */
  static rand (r) {
    return Math.floor(Math.random() * r)
  }

  /**
   * Generate random GDQ text
   * @returns {string} GDQ text
   */
  static generateText () {
    //Get date for AGDQ/SGDQ toggle
    let d = new Date()
    let year = d.getFullYear()
    let month = d.getMonth()

    //Check the date to see if AGDQ or SGDQ is on
    let gdq = month >= 5 ? "SGDQ" : "AGDQ"

    //Arrays of replacement text
    let textNoun = ["Germany", "cancer", "animal", "donation", "viewer", "frames", "games"]
    let textVerb = ["kill", "save", "donate", "view"] //Destroyed,
    let textVerber = ["donator", "viewer", "runner"] //runners
    let textVerbing = ["watching", "working"]
    let textSt = ["first", "second", "third", "fourth"]
    let text

    //Choose random template
    switch (Gdq.rand(6)) {
      case 0:
        text = "Hey guys, long time " + textVerber[Gdq.rand(textVerber.length)] + ", " + textSt[Gdq.rand(textSt.length)] + " time " + textVerber[Gdq.rand(textVerber.length)] + ". It gives me great joy to " + textVerb[Gdq.rand(textVerb.length)] + " to a great cause. Greetings from " + textNoun[Gdq.rand(textNoun.length)] + ". PS: " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + ", " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + "."
        break
      case 1:
        text = "Greetings from " + textNoun[Gdq.rand(textNoun.length)] + ". Long time " + textVerber[Gdq.rand(textVerber.length)] + ", " + textSt[Gdq.rand(textSt.length)] + " time " + textVerber[Gdq.rand(textVerber.length)] + ". I am donating because my " + textNoun[Gdq.rand(textNoun.length)] + " has died from " + textNoun[Gdq.rand(textNoun.length)] + "."
        break
      case 2:
        text = textSt[Gdq.rand(textSt.length)] + " time watching " + gdq + ", " + textSt[Gdq.rand(textSt.length)] + " time " + textVerber[Gdq.rand(textVerber.length)] + ". My " + textNoun[Gdq.rand(textNoun.length)] + " passed away from " + textNoun[Gdq.rand(textNoun.length)] + ". Money goes to " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + ", " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + ". Hype!!!!"
        //upper case the first letter
        text = text.charAt(0).toUpperCase() + text.slice(1)
        break
      case 3:
        text = "Had to " + textVerb[Gdq.rand(textVerb.length)] + " during this run. Put my money towards " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + ". Lets kick " + textNoun[Gdq.rand(textNoun.length)] + "'s butt!"
        break
      case 4:
        text = "Another great day of " + gdq + ". Love " + textVerbing[Gdq.rand(textVerbing.length)] + " my childhood " + textNoun[Gdq.rand(textNoun.length)] + " get destroyed. Money goes to " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + ", " + textVerb[Gdq.rand(textVerb.length)] + " the " + textNoun[Gdq.rand(textNoun.length)] + "."
        break
      case 5:
        text = "Thanks to the " + textVerber[Gdq.rand(textVerber.length)] + " and those " + textVerbing[Gdq.rand(textVerbing.length)] + " behind the scenes, glad to " + textVerb[Gdq.rand(textVerb.length)] + " to such a worthy cause. Put this " + textNoun[Gdq.rand(textNoun.length)] + " towards " + textVerber[Gdq.rand(textVerber.length)] + "'s choice!"
        break
    }
    //Uppercase the first letter
    return text
  }
}

module.exports = Gdq
