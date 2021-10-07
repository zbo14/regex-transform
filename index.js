'use strict'

const EventEmitter = require('events')
const stream = require('stream')

const DEFAULT_TRUE_VALUES = [
  '1',
  'true',
  't',
  'yes',
  'y'
]

const DEFAULT_FALSE_VALUES = [
  '0',
  'false',
  'f',
  'no',
  'n'
]

const parseBoolean = (string, keyConfig) => {
  string = string.trim().toLowerCase()

  const trueValues = [].concat(keyConfig.true || DEFAULT_TRUE_VALUES)

  if (trueValues.includes(string)) return true

  const falseValues = [].concat(keyConfig.false || DEFAULT_FALSE_VALUES)

  if (falseValues.includes(string)) return false

  return null
}

/**
 * A transform stream that writes text, matches it against a
 * regular expression, and reads the parsed JavaScript values.
 *
 * @extends stream.Transform
 */
class RegexTransform extends stream.Transform {
  /**
   * @param  {RegExp}            regex
   * @param  {(Object|String[])} [config]
   */
  constructor (regex, config) {
    if (!(regex instanceof RegExp) || !regex.global) {
      throw new Error('Expected regex to be a global RegExp')
    }

    if (config) {
      const isStringArray = (
        Array.isArray(config) &&
        config.every(key => key && typeof key === 'string')
      )

      const isObjectLiteral = config?.constructor?.name === 'Object'

      if (!isStringArray && !isObjectLiteral) {
        throw new Error('Expected config to be a string array or object literal')
      }
    }

    super({ readableObjectMode: true })

    this.config = config
    this.data = ''
    this.keys = Array.isArray(config) ? config : Object.keys(config || {})
    this.regex = regex
  }

  /**
   * Collects all the data into an array and
   * resolves the array when the stream ends.
   *
   * @return {Promise} resolves to array
   */
  async collect () {
    const results = []
    const promise = EventEmitter.once(this, 'end')
    const listener = result => results.push(result)

    this.on('data', listener)

    await promise

    this.removeListener('data', listener)

    return results
  }

  doMatching (flush, cb) {
    const matches = this.data.matchAll(this.regex)
    const configIsObject = !Array.isArray(this.config)

    let dec = 0
    let index

    for (const match of matches) {
      index = match.index - dec + match[0].length

      if (!flush && index === this.data.length) break

      this.data = this.data.slice(index)
      dec += index

      if (!this.config) {
        this.push([...match])
        continue
      }

      const result = {}

      let ref

      for (let i = 0; i < this.keys.length; i++) {
        const key = this.keys[i]
        const parts = key.split('.')

        ref = result

        for (let j = 0; j < parts.length - 1; j++) {
          ref = ref[parts[j]] = ref[parts[j]] || {}
        }

        let value = match[i + 1]

        if (configIsObject) {
          const keyConfig = this.config[key]

          const type = typeof keyConfig === 'string'
            ? keyConfig
            : keyConfig.type

          switch (type) {
            case 'boolean':
              value = parseBoolean(value, keyConfig)
              break

            case 'number':
              value = +value
              break
          }
        }

        ref[parts.pop()] = value
      }

      this.push(result)
    }

    cb()
  }

  _transform (chunk, _, cb) {
    this.data += chunk
    this.doMatching(false, cb)
  }

  _flush (cb) {
    this.doMatching(true, cb)
  }
}

module.exports = RegexTransform
