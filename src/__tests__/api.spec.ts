import { expect } from 'chai'

import {
  BoardIdentifier,
  PortIdentifier,
  boardIdentifierComparator,
  boardIdentifierEquals,
  createPortKey,
  findMatchingPortIndex,
  isDefinedBoardsConfig,
  parsePortKey,
  portIdentifierEquals,
  portProtocolComparator,
} from '../api'
import {
  builtinSerialPort,
  mkr1000,
  mkr1000NetworkPort,
  mkr1000SerialPort,
  nanoEsp32SerialPort,
} from './fixtures'

describe('api', () => {
  // #region Based on the Arduino IDE (https://github.com/arduino/arduino-ide/pull/2165)
  // Source https://github.com/arduino/arduino-ide/blob/73b6dc4774297e53f7ea0affdbc3f7e963b8e980/arduino-ide-extension/src/test/common/boards-service.test.ts#L18-L122
  describe('boardIdentifierEquals', () => {
    it('should not be equal when the names equal but the FQBNs are different', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'a', fqbn: 'x:y:z' }
      )
      expect(actual).to.be.false
    })

    it('should not be equal when the names equal but the FQBNs are different (undefined)', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'a', fqbn: undefined }
      )
      expect(actual).to.be.false
    })

    it("should be equal when the names do not match but the FQBNs are the same (it's something IDE2 assumes to be handled by the platform or CLI)", () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'b', fqbn: 'a:b:c' }
      )
      expect(actual).to.be.true
    })

    it('should be equal when the names equal and the FQBNs are missing', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: undefined },
        { name: 'a', fqbn: undefined }
      )
      expect(actual).to.be.true
    })

    it('should be equal when both the name and FQBN are the same, but one of the FQBN has board config options', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c:menu_1=value' },
        { name: 'a', fqbn: 'a:b:c' }
      )
      expect(actual).to.be.true
    })

    it('should not be equal when both the name and FQBN are the same, but one of the FQBN has board config options (looseFqbn: false)', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c:menu_1=value' },
        { name: 'a', fqbn: 'a:b:c' },
        { looseFqbn: false }
      )
      expect(actual).to.be.false
    })
    // #endregion

    it('should handle falsy', () => {
      const sample: BoardIdentifier = { name: 'a', fqbn: 'a:b:c' }
      const cases: Array<
        [BoardIdentifier | undefined, BoardIdentifier | undefined]
      > = [
        [sample, undefined],
        [undefined, sample],
      ]

      for (const [left, right] of cases) {
        expect(boardIdentifierEquals(left, right)).to.be.false
      }
    })
  })

  // #region Based on the Arduino IDE (https://github.com/arduino/arduino-ide/pull/2165)
  // Source https://github.com/arduino/arduino-ide/blob/73b6dc4774297e53f7ea0affdbc3f7e963b8e980/arduino-ide-extension/src/test/common/boards-service.test.ts#L18-L122
  describe('boardIdentifierComparator', () => {
    it('should sort items before falsy', () =>
      expect(
        boardIdentifierComparator({ name: 'a', fqbn: 'a:b:c' }, undefined)
      ).to.be.equal(-1))

    it("should sort 'arduino' boards before others", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: 'x:y:z' }
        )
      ).to.be.equal(-1))

    it("should sort 'arduino' boards before others (other is falsy)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(-1))

    it("should sort boards by 'name' (with FQBNs)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'a:b:c' },
          { name: 'a', fqbn: 'x:y:z' }
        )
      ).to.be.equal(1))

    it("should sort boards by 'name' (no FQBNs)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: undefined },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(1))

    it("should sort boards by 'name' (one FQBN)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'a:b:c' },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(1))

    it("should sort boards by 'name' (both 'arduino' vendor)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: 'arduino:y:z' }
        )
      ).to.be.equal(1))
    // #endregion

    it('should be true when both are undefined', () => {
      expect(boardIdentifierComparator(undefined, undefined)).to.be.equal(0)
    })

    it('should be false when of them is undefined', () => {
      const cases: Array<
        [BoardIdentifier | undefined, BoardIdentifier | undefined, number]
      > = [
        [mkr1000, undefined, -1],
        [undefined, mkr1000, 1],
      ]

      for (const [left, right, expected] of cases) {
        expect(boardIdentifierComparator(left, right)).to.be.equal(expected)
      }
    })
  })

  describe('findMatchingPortIndex', () => {
    it('should find the matching index of the detected port', () => {
      const port: PortIdentifier = {
        protocol: mkr1000SerialPort.protocol,
        address: mkr1000SerialPort.address,
      }
      const ports = [builtinSerialPort, mkr1000SerialPort, nanoEsp32SerialPort]
      const actual = findMatchingPortIndex(port, ports)
      expect(actual).to.be.equal(1)
    })

    it('should return -1 when not found', () => {
      const actual = findMatchingPortIndex(undefined, [])
      expect(actual).to.be.equal(-1)
    })
  })

  describe('isDefinedBoardsConfig', () => {
    it('should be false when config is undefined', () => {
      expect(isDefinedBoardsConfig(undefined)).to.be.false
    })

    it('should be false when no selected board', () => {
      expect(
        isDefinedBoardsConfig({
          selectedPort: builtinSerialPort,
          selectedBoard: undefined,
        })
      ).to.be.false
    })

    it('should be false when no selected port', () => {
      expect(
        isDefinedBoardsConfig({
          selectedPort: undefined,
          selectedBoard: mkr1000,
        })
      ).to.be.false
    })
  })

  describe('portIdentifierEquals', () => {
    it('should be true when both undefined', () => {
      expect(portIdentifierEquals(undefined, undefined)).to.be.true
    })

    it('should be false when one of them is falsy', () => {
      const cases: Array<
        [PortIdentifier | undefined, PortIdentifier | undefined]
      > = [
        [builtinSerialPort, undefined],
        [undefined, builtinSerialPort],
      ]

      for (const [left, right] of cases) {
        expect(portIdentifierEquals(left, right)).to.be.false
      }
    })

    it("should be false when 'protocol' does not match", () => {
      expect(
        portIdentifierEquals(builtinSerialPort, {
          ...builtinSerialPort,
          protocol: 'teensy',
        })
      ).to.be.false
    })

    it("should be false when 'address' does not match", () => {
      expect(
        portIdentifierEquals(builtinSerialPort, {
          ...builtinSerialPort,
          address: 'COM0',
        })
      ).to.be.false
    })
  })

  describe('portProtocolComparator', () => {
    it('should order serial protocol first', () => {
      expect(
        portProtocolComparator(builtinSerialPort, mkr1000NetworkPort)
      ).to.be.lessThan(0)
    })

    it('should order other protocols last', () => {
      expect(
        portProtocolComparator(
          { protocol: 'teensy', address: 'COM2' },
          mkr1000NetworkPort
        )
      ).to.be.greaterThan(0)
    })

    it('should be 0 when the protocols are equal', () => {
      expect(
        portProtocolComparator(
          { protocol: 'teensy', address: 'COM2' },
          { protocol: 'teensy', address: 'COM1' }
        )
      ).to.be.equal(0)
    })
  })

  describe('portKey', () => {
    it('should create port-prefixed keys', () => {
      const actual = createPortKey(builtinSerialPort)
      expect(actual).to.be.equal(
        `port+${builtinSerialPort.protocol}://${builtinSerialPort.address}`
      )
    })

    it('should revive a port identifier from a key', () => {
      const portKey = createPortKey(mkr1000SerialPort)
      const actual = parsePortKey(portKey)
      expect(actual).to.deep.equal({
        protocol: mkr1000SerialPort.protocol,
        address: mkr1000SerialPort.address,
      })
    })

    it('should return undefined for invalid keys', () => {
      const cases = [
        'arduino+serial:///dev/cu.usbmodem14201',
        'port+serial://',
        'port+://dev/cu.usbmodem14201',
        'port+serial:/dev/cu.usbmodem14201',
      ]

      for (const portKey of cases) {
        expect(parsePortKey(portKey)).to.be.undefined
      }
    })
  })
})
