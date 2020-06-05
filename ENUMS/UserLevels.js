"use strict"

/**
 * From UserLevesl enum.
 * @typedef {number} UserLevel From UserLevels enum.
 */

/**
 * @readonly
 * @typedef {object} UserLevels
 * @property {UserLevel} DEFAULT 0
 * @property {UserLevel} PLEB 0
 * @property {UserLevel} USER 0
 * @property {UserLevel} SUB 1
 * @property {UserLevel} FOUNDER 1
 * @property {UserLevel} SUBSCRIBER 1
 * @property {UserLevel} VIP 2
 * @property {UserLevel} MOD 3
 * @property {UserLevel} MODERATOR 3
 * @property {UserLevel} BROADCASTER 4
 * @property {UserLevel} BOTADMIN 5
 * @property {UserLevel} BOTOWNER 6
 */

/**
 * @type {UserLevels}
 */
module.exports = Object.freeze({
  "DEFAULT": 0,
  "PLEB": 0,
  "USER": 0,
  "SUB": 1,
  "FOUNDER": 1,
  "SUBSCRIBER": 1,
  "VIP": 2,
  "MOD": 3,
  "MODERATOR": 3,
  "BROADCASTER": 4,
  "BOTADMIN": 5,
  "BOTOWNER": 6
})
