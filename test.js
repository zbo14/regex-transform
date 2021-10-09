'use strict'

const t = require('tap')
const RegexTransform = require('.')

t.test('it throws if match isn\'t RegExp', t => {
  try {
    const rt = new RegexTransform('abc')
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected regex to be a global RegExp')
  }

  t.end()
})

t.test('it throws if config key isn\'t string', t => {
  try {
    const rt = new RegexTransform(/abc/g, ['1', 1])
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected config to be a string array or object literal')
  }

  t.end()
})

t.test('it throws if config key is empty string', t => {
  try {
    const rt = new RegexTransform(/abc/g, ['1', ''])
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected config to be a string array or object literal')
  }

  t.end()
})

t.test('it throws if config isn\'t array or object literal', t => {
  try {
    const rt = new RegexTransform(/abc/g, Object.create(null))
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected config to be a string array or object literal')
  }

  t.end()
})

t.test('it throws if config value isn\'t string or object literal', t => {
  try {
    const rt = new RegexTransform(/abc/g, { foo: ['bar'] })
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Expected config value to be string, function, or object literal')
  }

  t.end()
})

t.test('it throws if config value isn\'t recognized type', t => {
  try {
    const rt = new RegexTransform(/abc/g, { foo: 'float' })
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Invalid type in config: float')
  }

  t.end()
})

t.test('it throws if config boolean has invalid \'true\' value', t => {
  try {
    const rt = new RegexTransform(/abc/g, { foo: { type: 'boolean', true: true } })
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Invalid value in config: \'true\' must be a string or array of strings')
  }

  t.end()
})

t.test('it throws if config boolean has invalid \'true\' value', t => {
  try {
    const rt = new RegexTransform(/abc/g, { foo: { type: 'boolean', false: 1 } })
    console.log(rt)
    throw new Error('Should throw')
  } catch ({ message }) {
    t.equal(message, 'Invalid value in config: \'false\' must be a string or array of strings')
  }

  t.end()
})

t.test('checks stream output', async t => {
  const rt = new RegexTransform(/ab(\d+)/g)
  const promise = rt.collect()

  rt.write('ab')
  rt.write('1 a')
  rt.write('b3 ab4')
  rt.write('0')
  rt.write('1')
  rt.write('xyz ab29')

  rt.end()

  t.strictSame(await promise, [
    ['ab1', '1'],
    ['ab3', '3'],
    ['ab401', '401'],
    ['ab29', '29']
  ])

  t.end()
})

t.test('checks stream output with named parameters', async t => {
  const regex = /person:\s*(\w+)\s*,\s*(\d+)/g
  const rt = new RegexTransform(regex, ['name', 'age'])
  const promise = rt.collect()

  rt.write('per')
  rt.write('son:')
  rt.write('  alice, 30 ')
  rt.write('person')
  rt.write(':      bob,   5')
  rt.write('5')
  rt.write('person:           ')
  rt.write('  child, ?\t\n')
  rt.write('idk some other stuff.. ')

  rt.end()

  t.strictSame(await promise, [
    { name: 'alice', age: '30' },
    { name: 'bob', age: '55' }
  ])

  t.end()
})

t.test('checks stream output with named parameters and values', async t => {
  const regex = /person:\s*(\w+)\s*,\s*(\d+),\s*(\w+)/g

  const rt = new RegexTransform(regex, {
    'person.name': 'string',
    'person.age': 'number',

    signed_up: {
      type: 'boolean',
      true: ['y', 'yes'],
      false: 'n'
    }
  })

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

  t.strictSame(await promise, [
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

  t.end()
})

t.test('checks stream output with named parameters and (default) values', async t => {
  const regex = /person:\s*(\w+)\s*,\s*(\d+),\s*(\w+)/g

  const rt = new RegexTransform(regex, {
    'person.name': { type: 'string' },
    'person.age': { type: 'number' },
    signed_up: { type: 'boolean' }
  })

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

  t.strictSame(await promise, [
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
      signed_up: false
    }
  ])

  t.end()
})

t.test('checks stream output with named parameters and values', async t => {
  const regex = /person:\s*(\w+)\s*,\s*(\d+),\s*\[(.*?)\]/g

  const rt = new RegexTransform(regex, {
    'person.name': 'string',
    'person.age': 'number',

    faves: faves => {
      const [icecream, color] = faves
        .split('-')
        .map(x => x.trim())

      return { icecream, color }
    }
  })

  const promise = rt.collect()

  rt.write('per')
  rt.write('son:')
  rt.write('  alice, 30, [ rocky road - heliotrope]')
  rt.write('person')
  rt.write(':      bob,   5')
  rt.write('5,         [mint chip- burnt umber   ]   ')
  rt.write('person')
  rt.write(':charlie,26,')
  rt.write('   y ')
  rt.write('person:           ')
  rt.write('  child, 1, 0\t\n')
  rt.write('idk some other stuff.. ')

  rt.end()

  t.strictSame(await promise, [
    {
      person: { name: 'alice', age: 30 },
      faves: { icecream: 'rocky road', color: 'heliotrope' }
    },
    {
      person: { name: 'bob', age: 55 },
      faves: { icecream: 'mint chip', color: 'burnt umber' }
    }  ])

  t.end()
})
