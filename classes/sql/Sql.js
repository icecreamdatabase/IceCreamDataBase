"use strict"
const Mysql = require('mysql2')
const Util = require('util')

const options = require('../../config.json')

//cast bit(1) to boolean
//https://www.bennadel.com/blog/3188-casting-bit-fields-to-booleans-using-the-node-js-mysql-driver.htm
options.mysqloptions.typeCast = function castField (field, useDefaultTypeCasting) {
  // We only want to cast bit fields that have a single-bit in them. If the field
  // has more than one bit, then we cannot assume it is supposed to be a Boolean.
  if ((field.type === "BIT") && (field.length === 1)) {
    let bytes = field.buffer()
    //Account for the (hopefully rare) case in which a BIT(1) field would be NULL
    if (bytes === null) {
      return null
    }
    // A Buffer in Node represents a collection of 8-bit unsigned integers.
    // Therefore, our single "bit field" comes back as the bits '0000 0001',
    // which is equivalent to the number 1.
    return (bytes[0] === 1)
  }
  return (useDefaultTypeCasting())
}

class Sql {
  constructor () {
    let pool = Mysql.createPool(options.mysqloptions)

    pool.query = Util.promisify(pool.query) // Magic happens here.
    pool.execute = Util.promisify(pool.execute) // Magic happens here.

    this.pool = pool
  }

  /**
   * Returns the SqL instance
   * @returns {Sql}
   */
  static getInstance () {
    // noinspection JSUnresolvedVariable
    if (global.SqlSingletonInstance === undefined) {
      // noinspection JSUndefinedPropertyAssignment
      global.SqlSingletonInstance = new Sql()
    }
    // noinspection JSUnresolvedVariable
    return global.SqlSingletonInstance
  }

}

module.exports = Sql.getInstance() //TODO do all singleton classes like this
