'use strict'

const assert = require('assert')
const RegexTransform = require('.')

const regex = /person:\s*(\w+)\s*,\s*(\d+),\s*(\w+)/g

const config = {
  'person.name': 'string',
  'person.age': 'number',

  signed_up: {
    type: 'boolean',
    true: ['y', 'yes'],
    false: 'n'
  }
}

const rt = new RegexTransform(regex, config)

rt.on('data', console.log)

const promise = rt.collect()

rt.write('per')
rt.write('son:')
rt.write('  alice, 30, yes ')
rt.write('person')
rt.write(':      bob,   5')
rt.write('5,          n   ')
rt.write('person')
rt.write(':charlie,26,')
rt.write('   y ')
rt.write('person:           ')
rt.write('  child, 1, 0\t\n')
rt.write('idk some other stuff.. ')

rt.end()

promise
  .then(results => {
    assert.deepStrictEqual(results, [
      {
        person: { name: 'alice', age: 30 },
        signed_up: true
      },
      {
        person: { name: 'bob', age: 55 },
        signed_up: false
      },
      {
        person: { name: 'charlie', age: 26 },
        signed_up: true
      },
      {
        person: { name: 'child', age: 1 },
        signed_up: null
      }
    ])
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
