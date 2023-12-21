# fqbn

Arduino FQBN (fully qualified board name)

```
VENDOR:ARCHITECTURE:BOARD_ID[:MENU_ID=OPTION_ID[,MENU2_ID=OPTION_ID ...]]
```

> ℹ️ [What's the FQBN string?](https://arduino.github.io/arduino-cli/latest/FAQ/#whats-the-fqbn-string)

> ℹ️ Check the `{build.fqbn}` entry in the Arduino [Platform specification](https://arduino.github.io/arduino-cli/latest/platform-specification/#global-predefined-properties) for more details.

## Install

```sh
npm install fqbn
```

## API

CommonJS:

```js
const { FQBN, valid } = require('fqbn');
```

TypeScript:

```ts
import { FQBN, valid } from 'fqbn';
```

```js
// valid
assert.ok(valid('arduino:samd:mkr1000'));
assert.strictEqual(
  valid('arduino:samd:mkr1000:o1=v1'),
  'arduino:samd:mkr1000:o1=v1'
);
assert.strictEqual(valid('invalid'), undefined);

const fqbn = new FQBN('arduino:samd:mkr1000');
assert.strictEqual(fqbn.vendor, 'arduino');
assert.strictEqual(fqbn.arch, 'samd');
assert.strictEqual(fqbn.boardId, 'mkr1000');
assert.strictEqual(fqbn.options, undefined);

// withConfigOptions (add)
const fqbn2 = fqbn.withConfigOptions({
  option: 'o1',
  values: [
    { value: 'v1', selected: true },
    { value: 'v2', selected: false },
  ],
});
assert.strictEqual(fqbn2.vendor, 'arduino');
assert.strictEqual(fqbn2.arch, 'samd');
assert.strictEqual(fqbn2.boardId, 'mkr1000');
assert.deepStrictEqual(fqbn2.options, { o1: 'v1' });

// immutable
assert.strictEqual(fqbn.options, undefined);

// withConfigOptions (add + update)
const fqbn3 = fqbn2.withConfigOptions(
  {
    option: 'o1',
    values: [
      { value: 'v1', selected: false },
      { value: 'v2', selected: true },
    ],
  },
  {
    option: 'o2',
    values: [
      { value: 'w1', selected: true },
      { value: 'w2', selected: false },
    ],
  }
);
assert.deepStrictEqual(fqbn3.options, { o1: 'v2', o2: 'w1' });

// toString
assert.strictEqual(fqbn.toString(), 'arduino:samd:mkr1000');
assert.strictEqual(fqbn2.toString(), 'arduino:samd:mkr1000:o1=v1');
assert.strictEqual(fqbn3.toString(), 'arduino:samd:mkr1000:o1=v2,o2=w1');
assert.strictEqual(fqbn3.toString(true), 'arduino:samd:mkr1000');

// sanitize
assert.strictEqual(fqbn3.sanitize().toString(), 'arduino:samd:mkr1000');

// equals
assert.ok(new FQBN('a:b:c:o1=v1,o2=v2').equals(new FQBN('a:b:c:o2=v2,o1=v1')));
```

## Development

1. Build

   ```sh
   npm run build
   ```

1. Test

   ```sh
   npm run test
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
