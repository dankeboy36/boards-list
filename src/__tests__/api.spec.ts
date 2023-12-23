import { expect } from 'chai';
import {
  BoardIdentifier,
  PortIdentifier,
  boardIdentifierComparator,
  boardIdentifierEquals,
  findMatchingPortIndex,
  isDefinedBoardsConfig,
  portIdentifierEquals,
  portProtocolComparator,
} from '../api';
import {
  builtinSerialPort,
  mkr1000,
  mkr1000NetworkPort,
  mkr1000SerialPort,
  nanoEsp32SerialPort,
} from './fixtures';

describe('api', () => {
  // #region Based on the Arduino IDE (https://github.com/arduino/arduino-ide/pull/2165)
  // Source https://github.com/arduino/arduino-ide/blob/73b6dc4774297e53f7ea0affdbc3f7e963b8e980/arduino-ide-extension/src/test/common/boards-service.test.ts#L18-L122
  describe('boardIdentifierEquals', () => {
    it('should not be equal when the names equal but the FQBNs are different', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'a', fqbn: 'x:y:z' }
      );
      expect(actual).to.be.false;
    });

    it('should not be equal when the names equal but the FQBNs are different (undefined)', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'a', fqbn: undefined }
      );
      expect(actual).to.be.false;
    });

    it("should be equal when the names do not match but the FQBNs are the same (it's something IDE2 assumes to be handled by the platform or CLI)", () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c' },
        { name: 'b', fqbn: 'a:b:c' }
      );
      expect(actual).to.be.true;
    });

    it('should be equal when the names equal and the FQBNs are missing', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: undefined },
        { name: 'a', fqbn: undefined }
      );
      expect(actual).to.be.true;
    });

    it('should be equal when both the name and FQBN are the same, but one of the FQBN has board config options', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c:menu_1=value' },
        { name: 'a', fqbn: 'a:b:c' }
      );
      expect(actual).to.be.true;
    });

    it('should not be equal when both the name and FQBN are the same, but one of the FQBN has board config options (looseFqbn: false)', () => {
      const actual = boardIdentifierEquals(
        { name: 'a', fqbn: 'a:b:c:menu_1=value' },
        { name: 'a', fqbn: 'a:b:c' },
        { looseFqbn: false }
      );
      expect(actual).to.be.false;
    });
    // #endregion

    it('should handle falsy', () => {
      let left: BoardIdentifier | undefined = { name: 'a', fqbn: 'a:b:c' };
      let right: BoardIdentifier | undefined = undefined;
      expect(boardIdentifierEquals(left, right)).to.be.false;
      right = left;
      left = undefined;
      expect(boardIdentifierEquals(left, right)).to.be.false;
    });
  });

  // #region Based on the Arduino IDE (https://github.com/arduino/arduino-ide/pull/2165)
  // Source https://github.com/arduino/arduino-ide/blob/73b6dc4774297e53f7ea0affdbc3f7e963b8e980/arduino-ide-extension/src/test/common/boards-service.test.ts#L18-L122
  describe('boardIdentifierComparator', () => {
    it('should sort items before falsy', () =>
      expect(
        boardIdentifierComparator({ name: 'a', fqbn: 'a:b:c' }, undefined)
      ).to.be.equal(-1));

    it("should sort 'arduino' boards before others", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: 'x:y:z' }
        )
      ).to.be.equal(-1));

    it("should sort 'arduino' boards before others (other is falsy)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(-1));

    it("should sort boards by 'name' (with FQBNs)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'a:b:c' },
          { name: 'a', fqbn: 'x:y:z' }
        )
      ).to.be.equal(1));

    it("should sort boards by 'name' (no FQBNs)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: undefined },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(1));

    it("should sort boards by 'name' (one FQBN)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'a:b:c' },
          { name: 'a', fqbn: undefined }
        )
      ).to.be.equal(1));

    it("should sort boards by 'name' (both 'arduino' vendor)", () =>
      expect(
        boardIdentifierComparator(
          { name: 'b', fqbn: 'arduino:b:c' },
          { name: 'a', fqbn: 'arduino:y:z' }
        )
      ).to.be.equal(1));
    // #endregion

    it('should be true when both are undefined', () => {
      expect(boardIdentifierComparator(undefined, undefined)).to.be.equal(0);
    });

    it('should be false when of them is undefined', () => {
      let left: BoardIdentifier | undefined = mkr1000;
      let right: BoardIdentifier | undefined = undefined;
      expect(boardIdentifierComparator(left, right)).to.be.lessThan(0);
      right = left;
      left = undefined;
      expect(boardIdentifierComparator(left, right)).to.be.greaterThan(0);
    });
  });

  describe('findMatchingPortIndex', () => {
    it('should find the matching index of the detected port', () => {
      const port: PortIdentifier = {
        protocol: mkr1000SerialPort.protocol,
        address: mkr1000SerialPort.address,
      };
      const ports = [builtinSerialPort, mkr1000SerialPort, nanoEsp32SerialPort];
      const actual = findMatchingPortIndex(port, ports);
      expect(actual).to.be.equal(1);
    });

    it('should return -1 when not found', () => {
      const actual = findMatchingPortIndex(undefined, []);
      expect(actual).to.be.equal(-1);
    });
  });

  describe('isDefinedBoardsConfig', () => {
    it('should be false when config is undefined', () => {
      expect(isDefinedBoardsConfig(undefined)).to.be.false;
    });

    it('should be false when no selected board', () => {
      expect(
        isDefinedBoardsConfig({
          selectedPort: builtinSerialPort,
          selectedBoard: undefined,
        })
      ).to.be.false;
    });

    it('should be false when no selected port', () => {
      expect(
        isDefinedBoardsConfig({
          selectedPort: undefined,
          selectedBoard: mkr1000,
        })
      ).to.be.false;
    });
  });

  describe('portIdentifierEquals', () => {
    it('should be true when both undefined', () => {
      expect(portIdentifierEquals(undefined, undefined)).to.be.true;
    });

    it('should be false when one of them is falsy', () => {
      let left: PortIdentifier | undefined = builtinSerialPort;
      let right: PortIdentifier | undefined = undefined;
      expect(portIdentifierEquals(left, right)).to.be.false;
      right = left;
      left = undefined;
      expect(portIdentifierEquals(left, right)).to.be.false;
    });

    it("should be false when 'protocol' does not match", () => {
      expect(
        portIdentifierEquals(builtinSerialPort, {
          ...builtinSerialPort,
          protocol: 'teensy',
        })
      ).to.be.false;
    });

    it("should be false when 'address' does not match", () => {
      expect(
        portIdentifierEquals(builtinSerialPort, {
          ...builtinSerialPort,
          address: 'COM0',
        })
      ).to.be.false;
    });
  });

  describe('portProtocolComparator', () => {
    it('should order serial protocol first', () => {
      expect(
        portProtocolComparator(builtinSerialPort, mkr1000NetworkPort)
      ).to.be.lessThan(0);
    });

    it('should order other protocols last', () => {
      expect(
        portProtocolComparator(
          { protocol: 'teensy', address: 'COM2' },
          mkr1000NetworkPort
        )
      ).to.be.greaterThan(0);
    });

    it('should be 0 when the protocols are equal', () => {
      expect(
        portProtocolComparator(
          { protocol: 'teensy', address: 'COM2' },
          { protocol: 'teensy', address: 'COM1' }
        )
      ).to.be.equal(0);
    });
  });
});
