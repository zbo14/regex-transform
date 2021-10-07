# regex-transform

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

A [transform stream](https://nodejs.org/dist/latest-v14.x/docs/api/stream.html#stream_class_stream_transform) that matches text on a regular expression and outputs JavaScript values.

## Install

`npm i regex-transform`

## Usage

To run the example: `npm run example`.

Check out the tests for more examples.

### Create the stream

```js
'use strict'

const assert = require('assert')
const RegexTransform = require('regex-transform')

const regex = /person:\s*(\w+)\s*,\s*(\d+),\s*(\w+)/g

// Config is optional
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
```

### Write and read data

```js
// continued...

// realistically, you'd pipe this into something else
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
```

## Documentation

`npm run docs`

Then open `./out/index.html` in your browser.

## Test

`npm test`

## Lint

`npm run lint` or `npm run lint:fix`
