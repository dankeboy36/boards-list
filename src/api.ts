import type { Board as ApiBoard, Port as ApiPort } from 'ardunno-cli'
import { FQBN } from 'fqbn'
import naturalCompare from 'natural-compare'

/**
 * Lightweight information to identify a board:
 *
 * - The board's `name` is to provide a fallback for the UI. Preferably do not use
 *   this property for any sophisticated logic and board comparison. It must
 *   never participate in the board's identification.
 * - The FQBN might contain boards config options if selected from the discovered
 *   ports (see
 *   [arduino/arduino-ide#1588](https://github.com/arduino/arduino-ide/issues/1588)).
 */
export type BoardIdentifier = Nullable<ApiBoard, 'fqbn'>

/**
 * Key is the combination of address and protocol formatted like
 * `'port+${protocol}://${address}'` used to uniquely identify a port.
 */
const portKeyPrefix = 'port+'
const portKeySeparator = '://'

export function createPortKey(
  port: PortIdentifier | Port | DetectedPort
): string {
  if (isPortIdentifier(port)) {
    return `${portKeyPrefix}${port.protocol}${portKeySeparator}${port.address}`
  }
  return createPortKey(port.port)
}

/** Rehydrates a port identifier from its key. */
export function parsePortKey(portKey: string): PortIdentifier | undefined {
  if (!portKey.startsWith(portKeyPrefix)) {
    return undefined
  }
  const withoutPrefix = portKey.slice(portKeyPrefix.length)
  const separatorIndex = withoutPrefix.indexOf(portKeySeparator)
  if (separatorIndex <= 0) {
    return undefined
  }
  const protocol = withoutPrefix.slice(0, separatorIndex)
  const address = withoutPrefix.slice(separatorIndex + portKeySeparator.length)
  if (!protocol || !address) {
    return undefined
  }
  return { protocol, address }
}

export function isPortIdentifier(arg: unknown): arg is PortIdentifier {
  return (
    Boolean(arg) &&
    typeof arg === 'object' &&
    (<PortIdentifier>arg).protocol !== undefined &&
    typeof (<PortIdentifier>arg).protocol === 'string' &&
    (<PortIdentifier>arg).address !== undefined &&
    typeof (<PortIdentifier>arg).address === 'string'
  )
}

export function isBoardIdentifier(arg: unknown): arg is BoardIdentifier {
  return (
    Boolean(arg) &&
    typeof arg === 'object' &&
    (<BoardIdentifier>arg).name !== undefined &&
    typeof (<BoardIdentifier>arg).name === 'string' &&
    ((<BoardIdentifier>arg).fqbn === undefined ||
      ((<BoardIdentifier>arg).fqbn !== undefined &&
        typeof (<BoardIdentifier>arg).fqbn === 'string'))
  )
}

/** See `boardsListItemComparator`. */
export function boardIdentifierComparator(
  left: BoardIdentifier | undefined,
  right: BoardIdentifier | undefined
): number {
  if (!left) {
    return right ? 1 : 0
  }
  if (!right) {
    return -1
  }
  const leftVendor = left.fqbn ? new FQBN(left.fqbn).vendor : undefined
  const rightVendor = right.fqbn ? new FQBN(right.fqbn).vendor : undefined
  if (leftVendor === 'arduino' && rightVendor !== 'arduino') {
    return -1
  }
  if (leftVendor !== 'arduino' && rightVendor === 'arduino') {
    return 1
  }
  return naturalCompare(left.name, right.name)
}

/**
 * @param options If `looseFqbn` is `true`, FQBN config options are ignored.
 *   Hence, `{ name: 'x', fqbn: 'a:b:c:o1=v1 }` equals `{ name: 'y', fqbn:
 *   'a:b:c' }`. It's `true` by default.
 */
export function boardIdentifierEquals(
  left: BoardIdentifier | undefined,
  right: BoardIdentifier | undefined,
  options: { looseFqbn: boolean } = { looseFqbn: true }
): boolean {
  if (!left) {
    return !right
  }
  if (!right) {
    return !left
  }
  if ((left.fqbn && !right.fqbn) || (!left.fqbn && right.fqbn)) {
    // This can be very tricky when comparing boards
    // the CLI's board search returns with falsy FQBN when the platform is not installed
    // the CLI's board list returns with the full FQBN (for detected boards) even if the platform is not installed
    // when there are multiple boards with the same name (Arduino Nano RP2040) from different platforms (Mbed Nano OS vs. the deprecated global Mbed OS)
    // maybe add some 3rd party platform overhead (https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json)
    // and it will get very tricky when comparing a board which has a FQBN and which does not.
    return false // TODO: This a strict now. Maybe compare name in the future.
  }
  if (left.fqbn && right.fqbn) {
    const leftFqbn = options.looseFqbn
      ? new FQBN(left.fqbn).toString(true)
      : left.fqbn
    const rightFqbn = options.looseFqbn
      ? new FQBN(right.fqbn).toString(true)
      : right.fqbn
    return leftFqbn === rightFqbn
  }
  // No more Genuino hack.
  // https://github.com/arduino/arduino-ide/blob/f6a43254f5c416a2e4fa888875358336b42dd4d5/arduino-ide-extension/src/common/protocol/boards-service.ts#L572-L581
  return left.name === right.name
}

export interface BoardsConfig {
  selectedBoard: BoardIdentifier | undefined
  selectedPort: PortIdentifier | undefined
}

/** Creates a new board config object with `undefined` properties. */
export function emptyBoardsConfig(): BoardsConfig {
  return {
    selectedBoard: undefined,
    selectedPort: undefined,
  }
}

export type Port = Optional<ApiPort, 'hardwareId' | 'properties'>

export function isPort(arg: unknown): arg is Port {
  return (
    isPortIdentifier(arg) &&
    (<Port>arg).label !== null &&
    typeof (<Port>arg).label === 'string' &&
    (<Port>arg).protocolLabel !== undefined &&
    typeof (<Port>arg).protocolLabel === 'string' &&
    ((<Port>arg).hardwareId === undefined ||
      typeof (<Port>arg).hardwareId === 'string') &&
    ((<Port>arg).properties === undefined ||
      typeof (<Port>arg).properties === 'object')
  )
}

export interface DetectedPort {
  readonly port: Port
  readonly boards?: BoardIdentifier[]
}

/**
 * The closest representation what the Arduino CLI detects with the `board list
 * --watch` gRPC equivalent. The keys are unique identifiers generated from the
 * port object (via `createPortKey`). The values are the detected ports with all
 * their optional `properties` and matching board list.
 */
export type DetectedPorts = Readonly<Record<string, DetectedPort>>

export function findMatchingPortIndex(
  toFind: PortIdentifier | undefined,
  ports: readonly DetectedPort[] | readonly Port[]
): number {
  if (!toFind) {
    return -1
  }
  const toFindPortKey = createPortKey(toFind)
  return ports.findIndex((port) => createPortKey(port) === toFindPortKey)
}

export function isDefinedBoardsConfig(
  boardsConfig: BoardsConfig | undefined
): boardsConfig is Defined<BoardsConfig> {
  if (!boardsConfig) {
    return false
  }
  return (
    boardsConfig.selectedBoard !== undefined &&
    boardsConfig.selectedPort !== undefined
  )
}

/** Bare minimum information to identify port. */
export type PortIdentifier = Readonly<Pick<ApiPort, 'protocol' | 'address'>>

export function portIdentifierEquals(
  left: PortIdentifier | undefined,
  right: PortIdentifier | undefined
): boolean {
  if (!left) {
    return !right
  }
  if (!right) {
    return !left
  }
  return left.protocol === right.protocol && left.address === right.address
}

// the smaller the number, the higher the priority
const portProtocolPriorities: Record<string, number> = {
  serial: 0,
  network: 1,
} as const

/** See `boardsListItemComparator`. */
export function portProtocolComparator(
  left: PortIdentifier,
  right: PortIdentifier
): number {
  const leftPriority =
    portProtocolPriorities[left.protocol] ?? Number.MAX_SAFE_INTEGER
  const rightPriority =
    portProtocolPriorities[right.protocol] ?? Number.MAX_SAFE_INTEGER
  return leftPriority - rightPriority
}
export function boardIdentifierLabel(
  board: BoardIdentifier,
  showFqbn = true
): string {
  const { name, fqbn } = board
  let label = name
  if (fqbn && showFqbn) {
    label += ` (${fqbn})`
  }
  return label
}

// https://github.com/arduino/arduino-ide/blob/73b6dc4774297e53f7ea0affdbc3f7e963b8e980/arduino-ide-extension/src/common/types.ts#L5-L7
export type Defined<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

// https://github.com/eclipse-theia/theia/blob/94103a29c640246f1f45b7fc52c10c93a023a0ed/packages/core/src/common/types.ts#L27
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

// Source https://stackoverflow.com/a/61108377/5529090
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

type OrUndefined<T> = {
  [P in keyof T]: T[P] | undefined
}
type Nullable<T, K extends keyof T> = Pick<OrUndefined<T>, K> & Omit<T, K>
