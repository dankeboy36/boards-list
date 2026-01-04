import { expect } from 'chai'

import { emptyBoardsConfig } from '../api'
import {
  BoardsListLabels,
  EditBoardsConfigActionParams,
  SelectBoardsConfigActionParams,
  __tests,
  createBoardsList,
  isInferredBoardsListItem,
  isMultiBoardsBoardsListItem,
} from '../boardsList'
import {
  arduinoNanoEsp32,
  bluetoothSerialPort,
  builtinSerialPort,
  createPort,
  detectedPort,
  detectedPorts,
  esp32NanoEsp32,
  esp32S3Box,
  esp32S3DevModule,
  history,
  mkr1000,
  mkr1000NetworkPort,
  mkr1000SerialPort,
  nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
  nanoEsp32SerialPort,
  undiscoveredSerialPort,
  undiscoveredUsbToUARTSerialPort,
  uno,
  unoSerialPort,
} from './fixtures'

/* eslint-disable camelcase */

const { notConnected, selectBoard, unconfirmedBoard, unknown } = __tests.nls

describe('board-list', () => {
  describe('labels', () => {
    it('should handle no selected board+port', () => {
      const { labels } = createBoardsList({})
      const expected: BoardsListLabels = {
        boardLabel: selectBoard,
        portProtocol: undefined,
        selected: false,
        tooltip: selectBoard,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle port selected (port detected)', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(unoSerialPort, uno),
        },
        { selectedBoard: undefined, selectedPort: unoSerialPort }
      )
      const expected: BoardsListLabels = {
        boardLabel: selectBoard,
        portProtocol: undefined,
        selected: false,
        tooltip: unoSerialPort.address,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle port selected (port not detected)', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(mkr1000SerialPort, mkr1000),
        },
        { selectedBoard: undefined, selectedPort: unoSerialPort }
      )
      const expected: BoardsListLabels = {
        boardLabel: selectBoard,
        portProtocol: undefined,
        selected: false,
        tooltip: `${unoSerialPort.address} ${notConnected}`,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle board selected (with FQBN)', () => {
      const { labels } = createBoardsList(
        {},
        { selectedBoard: uno, selectedPort: undefined }
      )
      const expected: BoardsListLabels = {
        boardLabel: uno.name,
        portProtocol: undefined,
        selected: false,
        tooltip: `${uno.name} (${uno.fqbn})`,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle board selected (no FQBN)', () => {
      const { labels } = createBoardsList(
        {},
        {
          selectedBoard: { name: 'my board', fqbn: undefined },
          selectedPort: undefined,
        }
      )
      const expected: BoardsListLabels = {
        boardLabel: 'my board',
        portProtocol: undefined,
        selected: false,
        tooltip: 'my board',
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle both selected (port not detected)', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(mkr1000SerialPort, mkr1000),
        },
        { selectedBoard: mkr1000, selectedPort: unoSerialPort }
      )
      const expected: BoardsListLabels = {
        boardLabel: mkr1000.name,
        portProtocol: 'serial',
        selected: false,
        tooltip: `${mkr1000.name} (${mkr1000.fqbn})\n${unoSerialPort.address} ${notConnected}`,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle both selected (board not discovered)', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(unoSerialPort, uno),
        },
        { selectedBoard: mkr1000, selectedPort: unoSerialPort }
      )
      const expected: BoardsListLabels = {
        boardLabel: mkr1000.name,
        portProtocol: 'serial',
        selected: false,
        tooltip: `${mkr1000.name} (${mkr1000.fqbn})\n${unoSerialPort.address}`,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle both selected (no FQBN)', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(unoSerialPort, { name: 'my board', fqbn: undefined }),
        },
        {
          selectedBoard: { name: 'my board', fqbn: undefined },
          selectedPort: unoSerialPort,
        }
      )
      const expected: BoardsListLabels = {
        boardLabel: 'my board',
        portProtocol: 'serial',
        selected: true,
        tooltip: `my board\n${unoSerialPort.address}`,
      }
      expect(labels).to.be.deep.equal(expected)
    })

    it('should handle both selected', () => {
      const { labels } = createBoardsList(
        {
          ...detectedPort(mkr1000NetworkPort, mkr1000),
        },
        { selectedBoard: mkr1000, selectedPort: mkr1000NetworkPort }
      )
      const expected: BoardsListLabels = {
        boardLabel: mkr1000.name,
        portProtocol: 'network',
        selected: true,
        tooltip: `${mkr1000.name} (${mkr1000.fqbn})\n${mkr1000NetworkPort.address}`,
      }
      expect(labels).to.be.deep.equal(expected)
    })
  })

  describe('createBoardsList', () => {
    it('should sort the items deterministically', () => {
      const { items } = createBoardsList(detectedPorts)

      expect(items.length).to.be.equal(Object.keys(detectedPorts).length)
      expect(items[0].board).deep.equal(mkr1000)
      expect(items[1].board).deep.equal(uno)
      expect(items[2].board).is.undefined
      expect(isMultiBoardsBoardsListItem(items[2])).to.be.true
      const boards2 = isMultiBoardsBoardsListItem(items[2])
        ? items[2].boards
        : undefined
      expect(boards2).deep.equal([arduinoNanoEsp32, esp32NanoEsp32])
      expect(items[3].board).is.undefined
      expect(isMultiBoardsBoardsListItem(items[3])).to.be.true
      const boards3 = isMultiBoardsBoardsListItem(items[3])
        ? items[3].boards
        : undefined
      expect(boards3).deep.equal([esp32S3Box, esp32S3DevModule])
      expect(items[4].port).deep.equal(builtinSerialPort)
      expect(items[5].port).deep.equal(bluetoothSerialPort)
      expect(items[6].port).deep.equal(undiscoveredUsbToUARTSerialPort)
      expect(items[7].port).deep.equal(undiscoveredSerialPort)
      expect(items[8].port.protocol).equal('network')
      expect(items[8].board).deep.equal(mkr1000)
    })

    it('should sort Arduino items before others', () => {
      const detectedPorts = {
        ...detectedPort(createPort('a'), { name: 'aa', fqbn: 'arduino:a:a' }),
        ...detectedPort(createPort('b'), { name: 'ab', fqbn: 'other:a:b' }),
        ...detectedPort(createPort('c'), { name: 'ac', fqbn: 'arduino:a:c' }),
      }
      const { items } = createBoardsList(detectedPorts)

      expect(items.length).to.be.equal(3)
      expect(items[0].board?.name).to.be.equal('aa')
      expect(items[1].board?.name).to.be.equal('ac')
      expect(items[2].board?.name).to.be.equal('ab')
    })

    it('should sort items by inferred board if any', () => {
      const portA = createPort('portA')
      const portB = createPort('portB')
      const detectedPorts = {
        ...detectedPort(portA),
        ...detectedPort(portB),
      }
      const BoardsListHistory = {
        ...history(portA, { name: 'bbb', fqbn: undefined }),
        ...history(portB, { name: 'aaa', fqbn: undefined }),
      }
      const { items } = createBoardsList(
        detectedPorts,
        emptyBoardsConfig(),
        BoardsListHistory
      )

      expect(items.length).to.be.equal(2)
      expect(items[0].port.address).to.be.equal('portB')
      expect(items[0].board).to.be.undefined
      const inferredBoardA = isInferredBoardsListItem(items[0])
        ? items[0].inferredBoard
        : undefined
      expect(inferredBoardA).to.be.not.undefined
      expect(inferredBoardA?.name).to.be.equal('aaa')

      expect(items[1].port.address).to.be.equal('portA')
      expect(items[1].board).to.be.undefined
      expect(isInferredBoardsListItem(items[1])).to.be.true
      const inferredBoardB = isInferredBoardsListItem(items[1])
        ? items[1].inferredBoard
        : undefined
      expect(inferredBoardB).to.be.not.undefined
      expect(inferredBoardB?.name).to.be.equal('bbb')
    })

    it('should sort ambiguous boards with unique board name before other ambiguous boards', () => {
      const portA = createPort('portA')
      const portB = createPort('portB')
      const unique_ArduinoZZZ = { fqbn: 'arduino:e:f', name: 'zzz' }
      const unique_OtherZZZ = { fqbn: 'a:b:c', name: 'zzz' }
      const nonUnique_AAA = { fqbn: 'g:h:i', name: 'aaa' }
      const nonUnique_BBB = { fqbn: 'j:k:l', name: 'bbb' }
      const detectedPorts = {
        ...detectedPort(portA, nonUnique_AAA, nonUnique_BBB),
        ...detectedPort(portB, unique_OtherZZZ, unique_ArduinoZZZ),
      }
      const { items } = createBoardsList(detectedPorts)

      expect(items.length).to.be.equal(2)
      expect(isMultiBoardsBoardsListItem(items[0])).to.be.true
      const ambiguousBoardWithUniqueName = isMultiBoardsBoardsListItem(items[0])
        ? items[0]
        : undefined
      expect(ambiguousBoardWithUniqueName).to.be.not.undefined
      expect(ambiguousBoardWithUniqueName?.labels.boardLabel).to.be.equal(
        unique_ArduinoZZZ.name
      )
      expect(ambiguousBoardWithUniqueName?.port).to.be.deep.equal(portB)
      expect(ambiguousBoardWithUniqueName?.boards).to.be.deep.equal([
        unique_ArduinoZZZ,
        unique_OtherZZZ,
      ])

      expect(isMultiBoardsBoardsListItem(items[1])).to.be.true
      const ambiguousBoardWithoutName = isMultiBoardsBoardsListItem(items[1])
        ? items[1]
        : undefined
      expect(ambiguousBoardWithoutName).to.be.not.undefined
      expect(ambiguousBoardWithoutName?.labels.boardLabel).to.be.equal(
        unconfirmedBoard
      )
      expect(ambiguousBoardWithoutName?.port).to.be.deep.equal(portA)
      expect(ambiguousBoardWithoutName?.boards).to.be.deep.equal([
        nonUnique_AAA,
        nonUnique_BBB,
      ])
    })

    it('should detect when a discovered board is overridden by a historical selection', () => {
      const otherBoard = { name: 'other', fqbn: 'a:b:c' }
      const detectedPorts = {
        ...detectedPort(unoSerialPort, uno),
      }
      const BoardsListHistory = {
        ...history(unoSerialPort, otherBoard),
      }
      const { items } = createBoardsList(
        detectedPorts,
        emptyBoardsConfig(),
        BoardsListHistory
      )

      expect(items.length).to.be.equal(1)
      const inferredBoard = isInferredBoardsListItem(items[0])
        ? items[0]
        : undefined
      expect(inferredBoard).is.not.undefined
      expect(inferredBoard?.inferredBoard).to.be.deep.equal(otherBoard)
      expect(inferredBoard?.board).to.be.deep.equal(uno)
    })

    it(`should use the '${unknown}' as the board label when no boards were discovered on a detected port`, () => {
      const { items } = createBoardsList({ ...detectedPort(unoSerialPort) })
      expect(items[0].labels.boardLabel).to.be.equal(unknown)
    })

    describe('boards', () => {
      it('should include discovered boards on detected ports', () => {
        const { boards } = createBoardsList({
          ...detectedPort(unoSerialPort, uno),
          ...detectedPort(mkr1000SerialPort, mkr1000),
          ...detectedPort(undiscoveredSerialPort),
        })
        expect(boards).to.deep.equal([
          {
            port: mkr1000SerialPort,
            board: mkr1000,
          },
          {
            port: unoSerialPort,
            board: uno,
          },
        ])
      })

      it('should include manually selected boards on detected ports', () => {
        const { boards } = createBoardsList({
          ...detectedPort(unoSerialPort, uno),
          ...detectedPort(undiscoveredSerialPort, uno),
          ...detectedPort(undiscoveredUsbToUARTSerialPort),
        })
        expect(boards).to.deep.equal([
          {
            port: unoSerialPort,
            board: uno,
          },
          {
            port: undiscoveredSerialPort,
            board: uno,
          },
        ])
      })

      it('should include manually overridden boards on detected ports', () => {
        const { boards } = createBoardsList(
          {
            ...detectedPort(unoSerialPort, uno),
            ...detectedPort(mkr1000SerialPort, mkr1000),
          },
          emptyBoardsConfig(),
          {
            ...history(unoSerialPort, mkr1000),
          }
        )
        expect(boards).to.deep.equal([
          {
            port: mkr1000SerialPort,
            board: mkr1000,
          },
          {
            port: unoSerialPort,
            board: mkr1000,
          },
        ])
      })

      it('should include all boards discovered on a port', () => {
        const { boards } = createBoardsList({
          ...detectedPort(
            nanoEsp32SerialPort,
            arduinoNanoEsp32,
            esp32NanoEsp32
          ),
          ...detectedPort(
            nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
            esp32S3DevModule,
            esp32S3Box
          ),
        })
        expect(boards).to.deep.equal([
          {
            port: nanoEsp32SerialPort,
            board: arduinoNanoEsp32,
          },
          {
            port: nanoEsp32SerialPort,
            board: esp32NanoEsp32,
          },
          {
            port: nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
            board: esp32S3Box,
          },
          {
            port: nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
            board: esp32S3DevModule,
          },
        ])
      })

      it('should include all boards discovered on a port (handle manual select)', () => {
        const { boards } = createBoardsList(
          {
            ...detectedPort(
              nanoEsp32SerialPort,
              arduinoNanoEsp32,
              esp32NanoEsp32
            ),
          },
          emptyBoardsConfig(),
          {
            ...history(nanoEsp32SerialPort, esp32S3DevModule),
          }
        )
        expect(boards).to.deep.equal([
          {
            port: nanoEsp32SerialPort,
            board: arduinoNanoEsp32,
          },
          {
            port: nanoEsp32SerialPort,
            board: esp32NanoEsp32,
          },
          {
            port: nanoEsp32SerialPort,
            board: esp32S3DevModule,
          },
        ])
      })

      it('should sort ambiguous boards by their unique names first', () => {
        const portA = createPort('portA')
        const portB = createPort('portB')
        const boardA1 = { name: 'A', fqbn: 'a1:b:c' }
        const boardA2 = { name: 'A', fqbn: 'a2:b:c' }
        const boardB1 = { name: 'B', fqbn: 'a:b1:c' }
        const boardB2 = { name: 'B', fqbn: 'a:b2:c' }
        const { boards } = createBoardsList({
          ...detectedPort(portA, boardA1, boardA2),
          ...detectedPort(portB, boardB1, boardB2),
        })
        expect(boards).to.be.deep.equal([
          { port: portA, board: boardA1 },
          { port: portA, board: boardA2 },
          { port: portB, board: boardB1 },
          { port: portB, board: boardB2 },
        ])
      })

      it('should fall back to natural order of the port address', () => {
        const portA = createPort('portA')
        const portB = createPort('portB')
        const { boards } = createBoardsList({
          ...detectedPort(portB, mkr1000),
          ...detectedPort(portA, mkr1000),
        })
        expect(boards).to.be.deep.equal([
          { port: portA, board: mkr1000 },
          { port: portB, board: mkr1000 },
        ])
      })

      it('should sort items with ambiguous boards after others', () => {
        const portA = createPort('portA')
        const portB = createPort('portB')
        const { boards } = createBoardsList({
          ...detectedPort(portB, arduinoNanoEsp32, esp32NanoEsp32),
          ...detectedPort(portA),
        })
        expect(boards).to.be.deep.equal([
          { port: portB, board: arduinoNanoEsp32 },
          { port: portB, board: esp32NanoEsp32 },
        ])
      })
    })

    describe('defaultAction', () => {
      it("'select' should be the default action for identifier boards", () => {
        const { items } = createBoardsList({
          ...detectedPort(mkr1000SerialPort, mkr1000),
        })
        const item = items[0]
        expect(item.defaultAction.type).to.be.equal('select-boards-config')
        expect(item.defaultAction.params).to.be.deep.equal({
          selectedPort: mkr1000SerialPort,
          selectedBoard: mkr1000,
        })
      })

      it("'select' should be the default action for manually selected items (no discovered boards)", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(undiscoveredSerialPort),
          },
          emptyBoardsConfig(),
          {
            ...history(undiscoveredSerialPort, uno),
          }
        )
        const item = items[0]
        expect(item.defaultAction.type).to.be.equal('select-boards-config')
        expect(item.defaultAction.params).to.be.deep.equal({
          selectedPort: undiscoveredSerialPort,
          selectedBoard: uno,
        })
      })

      it("'select' should be the default action for manually selected items (ambiguous boards)", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(
              nanoEsp32SerialPort,
              arduinoNanoEsp32,
              esp32NanoEsp32
            ),
          },
          emptyBoardsConfig(),
          {
            ...history(nanoEsp32SerialPort, mkr1000),
          }
        )
        const item = items[0]
        expect(item.defaultAction.type).to.be.equal('select-boards-config')
        expect(item.defaultAction.params).to.be.deep.equal({
          selectedBoard: mkr1000,
          selectedPort: nanoEsp32SerialPort,
        })
      })

      it("'edit' should be the default action for ports with no boards", () => {
        const { items } = createBoardsList({
          ...detectedPort(undiscoveredSerialPort),
        })
        const item = items[0]
        expect(item).to.be.not.undefined
        expect(item.defaultAction.type).to.be.equal('edit-boards-config')
        const params = <EditBoardsConfigActionParams>item.defaultAction.params
        const expectedParams: EditBoardsConfigActionParams = {
          query: '',
          portToSelect: undiscoveredSerialPort,
        }
        expect(params).to.be.deep.equal(expectedParams)
      })

      it("'edit' should be the default action for ports with multiple boards (unique board name)", () => {
        const { items } = createBoardsList({
          ...detectedPort(
            nanoEsp32SerialPort,
            arduinoNanoEsp32,
            esp32NanoEsp32
          ),
        })
        const item = items[0]
        expect(item).to.be.not.undefined
        expect(item.defaultAction.type).to.be.equal('edit-boards-config')
        const params = <EditBoardsConfigActionParams>item.defaultAction.params
        const expectedParams: EditBoardsConfigActionParams = {
          query: arduinoNanoEsp32.name,
          portToSelect: nanoEsp32SerialPort,
          searchSet: [arduinoNanoEsp32, esp32NanoEsp32],
        }
        expect(params).to.be.deep.equal(expectedParams)
      })

      it("'edit' should be the default action for ports with multiple boards (no unique board name)", () => {
        const { items } = createBoardsList({
          ...detectedPort(
            nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
            esp32S3DevModule,
            esp32S3Box
          ),
        })
        const item = items[0]
        expect(item).to.be.not.undefined
        expect(item.defaultAction.type).to.be.equal('edit-boards-config')
        const params = <EditBoardsConfigActionParams>item.defaultAction.params
        const expectedParams: EditBoardsConfigActionParams = {
          query: '',
          portToSelect: nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
          searchSet: [esp32S3Box, esp32S3DevModule],
        }
        expect(params).to.be.deep.equal(expectedParams)
      })
    })

    describe('otherActions', () => {
      it('should provide no other actions for identified board', () => {
        const { items } = createBoardsList({
          ...detectedPort(mkr1000SerialPort, mkr1000),
        })
        const item = items[0]
        expect(item.otherActions).to.be.empty
      })

      it('should provide no other actions for identified board (when historical revision is self)', () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(mkr1000SerialPort, mkr1000),
          },
          emptyBoardsConfig(),
          {
            ...history(mkr1000SerialPort, mkr1000),
          }
        )
        const item = items[0]
        expect(item.otherActions).to.be.empty
      })

      it('should provide no other actions for unknown boards', () => {
        const { items } = createBoardsList({
          ...detectedPort(undiscoveredSerialPort),
        })
        const item = items[0]
        expect(item.otherActions).to.be.empty
      })

      it('should provide no other actions for ambiguous boards', () => {
        const { items } = createBoardsList({
          ...detectedPort(
            nanoEsp32SerialPort,
            arduinoNanoEsp32,
            esp32NanoEsp32
          ),
        })
        const item = items[0]
        expect(item.otherActions).to.be.empty
      })

      it("should provide 'edit' action for unidentified items with manually selected board", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(undiscoveredSerialPort),
          },
          emptyBoardsConfig(),
          {
            ...history(undiscoveredSerialPort, uno),
          }
        )
        const item = items[0]
        const expectedParams: EditBoardsConfigActionParams = {
          query: uno.name,
          portToSelect: undiscoveredSerialPort,
        }
        expect(item.otherActions).to.be.deep.equal({
          edit: {
            params: expectedParams,
            type: 'edit-boards-config',
          },
        })
      })

      it("should provide 'edit' action for ambiguous items with manually selected board (unique board name)", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(
              nanoEsp32SerialPort,
              esp32NanoEsp32,
              arduinoNanoEsp32
            ),
          },
          emptyBoardsConfig(),
          {
            ...history(nanoEsp32SerialPort, arduinoNanoEsp32),
          }
        )
        const item = items[0]
        const expectedParams: EditBoardsConfigActionParams = {
          query: arduinoNanoEsp32.name,
          portToSelect: nanoEsp32SerialPort,
          searchSet: [arduinoNanoEsp32, esp32NanoEsp32],
        }
        expect(item.otherActions).to.be.deep.equal({
          edit: {
            params: expectedParams,
            type: 'edit-boards-config',
          },
        })
      })

      it("should provide 'edit' action for ambiguous items with manually selected board (no unique board name)", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(
              nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
              esp32S3Box,
              esp32S3DevModule
            ),
          },
          emptyBoardsConfig(),
          {
            ...history(nanoEsp32DetectsMultipleEsp32BoardsSerialPort, uno),
          }
        )
        const item = items[0]
        const expectedParams: EditBoardsConfigActionParams = {
          query: '',
          portToSelect: nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
          searchSet: [esp32S3Box, esp32S3DevModule],
        }
        expect(item.otherActions).to.be.deep.equal({
          edit: {
            params: expectedParams,
            type: 'edit-boards-config',
          },
        })
      })

      it("should provide 'edit' and 'revert' actions for identified items with a manually overridden board", () => {
        const { items } = createBoardsList(
          {
            ...detectedPort(mkr1000SerialPort, mkr1000),
          },
          emptyBoardsConfig(),
          {
            ...history(mkr1000SerialPort, uno),
          }
        )
        const item = items[0]
        const expectedEditParams: EditBoardsConfigActionParams = {
          query: uno.name,
          portToSelect: mkr1000SerialPort,
        }
        const expectedRevertParams: SelectBoardsConfigActionParams = {
          selectedBoard: mkr1000,
          selectedPort: item.port,
        }
        expect(item.otherActions).to.be.deep.equal({
          edit: {
            params: expectedEditParams,
            type: 'edit-boards-config',
          },
          revert: {
            params: expectedRevertParams,
            type: 'select-boards-config',
          },
        })
      })
    })
  })

  describe('ports', () => {
    it('should filter the ports', () => {
      const boardsList = createBoardsList(detectedPorts, {
        selectedBoard: mkr1000,
        selectedPort: mkr1000NetworkPort,
      })
      const ports = boardsList.ports((p) => p.port.protocol === 'network')
      expect(ports).to.have.lengthOf(1)
      expect(ports[0]).to.be.deep.equal({
        port: mkr1000NetworkPort,
        boards: [mkr1000],
      })
      expect(ports.matchingIndex).to.be.equals(0)
    })
  })

  describe('should group to ports by protocol', () => {
    const actual = createBoardsList(detectedPorts).portsGroupedByProtocol()
    expect(actual).to.be.deep.equal({
      serial: [
        {
          port: mkr1000SerialPort,
          boards: [mkr1000],
        },
        {
          port: unoSerialPort,
          boards: [uno],
        },
        {
          port: nanoEsp32SerialPort,
          boards: [arduinoNanoEsp32, esp32NanoEsp32],
        },
        {
          port: nanoEsp32DetectsMultipleEsp32BoardsSerialPort,
          boards: [esp32S3Box, esp32S3DevModule],
        },
        {
          port: builtinSerialPort,
        },
        {
          port: bluetoothSerialPort,
        },
        {
          port: undiscoveredUsbToUARTSerialPort,
        },
        {
          port: undiscoveredSerialPort,
        },
      ],
      network: [
        {
          port: mkr1000NetworkPort,
          boards: [mkr1000],
        },
      ],
    })
  })
})
