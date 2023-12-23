import naturalCompare from 'natural-compare';
import {
  BoardIdentifier,
  BoardsConfig,
  Defined,
  DetectedPort,
  DetectedPorts,
  Mutable,
  Port,
  PortIdentifier,
  boardIdentifierComparator,
  boardIdentifierEquals,
  boardIdentifierLabel,
  createPortKey,
  emptyBoardsConfig,
  findMatchingPortIndex,
  isBoardIdentifier,
  isDefinedBoardsConfig,
  isPort,
  portProtocolComparator,
} from './api';

const nls = {
  unconfirmedBoard: 'Unconfirmed board',
  selectBoard: 'Select Board',
  notConnected: '[not connected]',
  unknown: 'Unknown',
} as const;

/**
 * Representation of a detected port with an optional board.
 */
export interface BoardsListItem {
  readonly port: Port;
  readonly board?: BoardIdentifier;
}

/**
 * Representation of a detected port with multiple discovered boards on the same port. For example Arduino Nano ESP32 from `esp32:esp32:nano_nora` and `arduino:esp32:nano_nora`.
 * If multiple boards are detected, but the board names are the same, the `board` will be the `first` element of the `boards` array.
 * If multiple boards are detected, but the board names are not identical, the `board` will be missing.
 */
export interface MultiBoardsBoardsListItem extends BoardsListItem {
  readonly boards: readonly BoardIdentifier[];
}

function findUniqueBoardName(
  item: MultiBoardsBoardsListItem
): string | undefined {
  const distinctNames = new Set(item.boards.map(({ name }) => name));
  if (distinctNames.size === 1) {
    const name = Array.from(distinctNames.keys()).shift();
    if (name) {
      return name;
    }
  }
  return undefined;
}

export function isMultiBoardsBoardsListItem(
  arg: unknown
): arg is MultiBoardsBoardsListItem {
  return (
    isBoardsListItem(arg) &&
    (<MultiBoardsBoardsListItem>arg).boards !== undefined &&
    Array.isArray((<MultiBoardsBoardsListItem>arg).boards) &&
    Boolean((<MultiBoardsBoardsListItem>arg).boards.length) &&
    (<MultiBoardsBoardsListItem>arg).boards.every(isBoardIdentifier)
  );
}

/**
 * Base inferred board list item type.
 * The the type of the inferred board can be:
 *   - manually specified board for a detected port where no boards were discovered,
 *   - the board has been overridden for detected port discovered board pair.
 */
export type InferredBoardsListItem =
  | ManuallySelectedBoardsListItem
  | BoardOverriddenBoardsListItem;

/**
 * No boards have been discovered for a detected port, it has been manually selected by the user.
 */
export interface ManuallySelectedBoardsListItem extends BoardsListItem {
  readonly inferredBoard: BoardIdentifier;
  readonly type: 'manually-selected';
}

/**
 * One or more boards have been discovered for a detected port, but the board has been overridden by a manual action.
 */
export interface BoardOverriddenBoardsListItem extends BoardsListItem {
  readonly inferredBoard: BoardIdentifier;
  readonly board: BoardIdentifier;
  readonly type: 'board-overridden';
}

export function isBoardsListItem(arg: unknown): arg is BoardsListItem {
  return (
    Boolean(arg) &&
    typeof arg === 'object' &&
    (<BoardsListItem>arg).port !== undefined &&
    isPort((<BoardsListItem>arg).port) &&
    ((<BoardsListItem>arg).board === undefined ||
      ((<BoardsListItem>arg).board !== undefined &&
        isBoardIdentifier((<BoardsListItem>arg).board)))
  );
}

export interface BoardsListItemWithBoard extends BoardsListItem {
  readonly board: BoardIdentifier;
}

function getBoardOrInferredBoard(
  item: BoardsListItem
): BoardIdentifier | undefined {
  let board: BoardIdentifier | undefined = undefined;
  board = item.board;
  if (!board && isInferredBoardsListItem(item)) {
    board = item.inferredBoard;
  }
  return board;
}

export function getInferredBoardOrBoard(
  item: BoardsListItem
): BoardIdentifier | undefined {
  if (isInferredBoardsListItem(item)) {
    return item.inferredBoard;
  }
  return item.board;
}

export function isInferredBoardsListItem(
  arg: unknown
): arg is InferredBoardsListItem {
  return (
    isBoardsListItem(arg) &&
    (<InferredBoardsListItem>arg).type !== undefined &&
    isInferenceType((<InferredBoardsListItem>arg).type) &&
    (<InferredBoardsListItem>arg).inferredBoard !== undefined &&
    isBoardIdentifier((<InferredBoardsListItem>arg).inferredBoard)
  );
}

/**
 * Stores historical info about boards manually specified for detected boards. The key are generated with `Port#keyOf`.
 */
export type BoardsListHistory = Readonly<Record<string, BoardIdentifier>>;

const inferenceTypeLiterals = [
  /**
   * The user has manually selected the board (FQBN) for the detected port of a 3rd party board (no matching boards were detected by the CLI for the port)
   */
  'manually-selected',
  /**
   * The user has manually edited the detected FQBN of a recognized board from a detected port (there are matching boards for a detected port, but the user decided to use another FQBN)
   */
  'board-overridden',
] as const;
type InferenceType = (typeof inferenceTypeLiterals)[number];
function isInferenceType(arg: unknown): arg is InferenceType {
  return (
    typeof arg === 'string' &&
    inferenceTypeLiterals.includes(<InferenceType>arg)
  );
}

/**
 * Compare precedence:
 *  1. `BoardsListItem#port#protocol`: `'serial'`, `'network'`, then natural compare of the `protocol` string.
 *  1. `BoardsListItem`s with a `board` comes before items without a `board`.
 *  1. `BoardsListItem#board`:
 *     1. Items with `'arduino'` vendor ID in the `fqbn` come before other vendors.
 *     1. Natural compare of the `name`.
 *  1. If the `BoardsListItem`s do not have a `board` property:
 *     1. Ambiguous boards come before no boards.
 *     1. `BoardsListItem#port#address` natural compare is the fallback.
 */
function BoardsListItemComparator(
  left: BoardsListItem,
  right: BoardsListItem
): number {
  // sort by port protocol
  let result = portProtocolComparator(left.port, right.port);
  if (result) {
    return result;
  }

  // compare by board
  result = boardIdentifierComparator(
    getBoardOrInferredBoard(left),
    getBoardOrInferredBoard(right)
  );
  if (result) {
    return result;
  }

  // detected ports with multiple discovered boards come before any other unknown items
  if (
    isMultiBoardsBoardsListItem(left) &&
    !isMultiBoardsBoardsListItem(right)
  ) {
    return -1;
  }
  if (
    !isMultiBoardsBoardsListItem(left) &&
    isMultiBoardsBoardsListItem(right)
  ) {
    return 1;
  }
  // ambiguous boards with a unique board name comes first than other ambiguous ones
  if (isMultiBoardsBoardsListItem(left) && isMultiBoardsBoardsListItem(right)) {
    const leftUniqueName = findUniqueBoardName(left);
    const rightUniqueName = findUniqueBoardName(right);
    if (leftUniqueName && !rightUniqueName) {
      return -1;
    }
    if (!leftUniqueName && rightUniqueName) {
      return 1;
    }
    if (leftUniqueName && rightUniqueName) {
      return naturalCompare(leftUniqueName, rightUniqueName);
    }
  }

  // fallback compare based on the address
  return naturalCompare(left.port.address, right.port.address);
}

/**
 * What is shown in the UI for the entire board list.
 */
export interface BoardsListLabels {
  readonly boardLabel: string;
  readonly portProtocol: string | undefined;
  readonly tooltip: string;
  /**
   * The client's board+port selection matches with one of the board list items.
   */
  readonly selected: boolean;
}

function createBoardsListLabels(
  boardsConfig: BoardsConfig,
  allPorts: readonly DetectedPort[],
  selectedItem: BoardsListItem | undefined
): BoardsListLabels {
  const { selectedBoard, selectedPort } = boardsConfig;
  const boardLabel = selectedBoard?.name || nls.selectBoard;
  let tooltip = '';
  if (!selectedBoard && !selectedPort) {
    tooltip = nls.selectBoard;
  } else {
    if (selectedBoard) {
      tooltip += boardIdentifierLabel(selectedBoard);
    }
    if (selectedPort) {
      if (tooltip) {
        tooltip += '\n';
      }
      tooltip += selectedPort.address;
      const index = findMatchingPortIndex(selectedPort, allPorts);
      if (index < 0) {
        tooltip += ` ${nls.notConnected}`;
      }
    }
  }
  return {
    boardLabel,
    portProtocol: selectedBoard ? selectedPort?.protocol : undefined,
    tooltip,
    selected: Boolean(selectedItem),
  };
}

/**
 * What is show in the UI for a particular board with all its refinements, fallbacks, and tooltips.
 */
export interface BoardsListItemLabels {
  readonly boardLabel: string;
  readonly boardLabelWithFqbn: string;
  readonly portLabel: string;
  readonly portProtocol: string;
  readonly tooltip: string;
}

export interface BoardsListItemUI extends BoardsListItem {
  readonly labels: BoardsListItemLabels;
  readonly defaultAction: BoardsListItemAction;
  readonly otherActions: Readonly<{
    edit?: EditBoardsConfigAction;
    revert?: SelectBoardsConfigAction;
  }>;
}

function createBoardsListItemLabels(
  item: BoardsListItem
): BoardsListItemLabels {
  const { port } = item;
  const portLabel = port.address;
  const portProtocol = port.protocol;
  let board = item.board; // use default board label if any
  if (isInferredBoardsListItem(item)) {
    board = item.inferredBoard; // inferred board overrides any discovered boards
  }
  // if the board is still missing, maybe it's ambiguous
  if (!board && isMultiBoardsBoardsListItem(item)) {
    const name =
      // get a unique board name
      findUniqueBoardName(item) ??
      // or fall back to something else than unknown board
      nls.unconfirmedBoard;
    board = { name, fqbn: undefined };
  }
  const boardLabel = board?.name ?? nls.unknown;
  let boardLabelWithFqbn = boardLabel;
  if (board?.fqbn) {
    boardLabelWithFqbn += ` (${board.fqbn})`;
  }
  return {
    boardLabel,
    boardLabelWithFqbn,
    portLabel,
    portProtocol,
    tooltip: `${boardLabelWithFqbn}\n${portLabel}`,
  };
}

/**
 * A list of boards discovered by the Arduino CLI. With the `board list --watch` gRPC equivalent command,
 * the CLI provides a `1..*` mapping between a port and the matching boards list. This type inverts the mapping
 * and makes a `1..1` association between a board identifier and the port it belongs to.
 */
export interface BoardsList {
  readonly labels: BoardsListLabels;
  /**
   * All detected ports with zero to many boards and optional inferred information based on historical selection/usage.
   */
  readonly items: readonly BoardsListItemUI[];
  /**
   * A snapshot of the board and port configuration this board list has been initialized with.
   */
  readonly boardsConfig: Readonly<BoardsConfig>;

  /**
   * Index of the board+port item that is currently "selected". A board list item is selected, if matches the board+port combination of `boardsConfig`.
   */
  readonly selectedIndex: number;

  /**
   * Contains all the following board+port pairs:
   *  - one discovered board on a detected board (`1`),
   *  - manually selected or overridden board for a detected port (`1`),
   *  - multiple discovered boards on detected port (`1..*`)
   */
  readonly boards: readonly BoardsListItemWithBoard[];

  /**
   * If `predicate` is not defined, no ports are filtered.
   */
  ports(
    predicate?: (detectedPort: DetectedPort) => boolean
  ): readonly DetectedPort[] & Readonly<{ matchingIndex: number }>;

  /**
   * Sugar for `#ports` with additional grouping based on the port `protocol`.
   */
  portsGroupedByProtocol(): Readonly<
    Record<'serial' | 'network' | string, ReturnType<BoardsList['ports']>>
  >;

  /**
   * For dumping the current state of board list for debugging purposes.
   */
  toString(): string;
}

export type SelectBoardsConfigActionParams = Readonly<Defined<BoardsConfig>>;
export interface SelectBoardsConfigAction {
  readonly type: 'select-boards-config';
  readonly params: SelectBoardsConfigActionParams;
}
export interface EditBoardsConfigActionParams {
  readonly portToSelect?: PortIdentifier;
  readonly boardToSelect?: BoardIdentifier;
  readonly query?: string;
  readonly searchSet?: readonly BoardIdentifier[];
}
export interface EditBoardsConfigAction {
  readonly type: 'edit-boards-config';
  readonly params: EditBoardsConfigActionParams;
}
export type BoardsListItemAction =
  | SelectBoardsConfigAction
  | EditBoardsConfigAction;

export function createBoardsList(
  detectedPorts: DetectedPorts,
  boardsConfig: Readonly<BoardsConfig> = emptyBoardsConfig(),
  history: BoardsListHistory = {}
): BoardsList {
  const items: BoardsListItemUI[] = [];
  for (const detectedPort of Object.values(detectedPorts)) {
    const item = createBoardsListItemUI(detectedPort, history);
    items.push(item);
  }
  items.sort(BoardsListItemComparator);
  const selectedIndex = findSelectedIndex(boardsConfig, items);
  const boards = collectBoards(items);
  const allPorts = collectPorts(items, detectedPorts);
  const labels = createBoardsListLabels(
    boardsConfig,
    allPorts,
    items[selectedIndex]
  );
  return {
    labels,
    items,
    boardsConfig,
    boards,
    selectedIndex,
    ports(predicate?: (detectedPort: DetectedPort) => boolean) {
      return filterPorts(allPorts, boardsConfig.selectedPort, predicate);
    },
    portsGroupedByProtocol() {
      const _allPorts = filterPorts(allPorts, boardsConfig.selectedPort);
      return portsGroupedByProtocol(_allPorts);
    },
    toString() {
      return JSON.stringify(
        {
          labels,
          detectedPorts,
          boardsConfig,
          items,
          selectedIndex,
          history,
        },
        null,
        2
      );
    },
  };
}

function portsGroupedByProtocol(
  allPorts: ReturnType<BoardsList['ports']>
): ReturnType<BoardsList['portsGroupedByProtocol']> {
  const result: Record<string, DetectedPort[] & { matchingIndex: number }> = {};
  for (const detectedPort of allPorts) {
    const protocol = detectedPort.port.protocol;
    if (!result[protocol]) {
      result[protocol] = Object.assign([], {
        matchingIndex: -1,
      });
    }
    const portsOnProtocol = result[protocol];
    portsOnProtocol.push(detectedPort);
  }
  const matchItem = allPorts[allPorts.matchingIndex];
  // the cached match index is per all ports. Here, IDE2 needs to adjust the match index per grouped protocol
  if (matchItem) {
    const matchProtocol = matchItem.port.protocol;
    const matchPorts = result[matchProtocol];
    matchPorts.matchingIndex = matchPorts.indexOf(matchItem);
  }
  return result;
}

function filterPorts(
  allPorts: readonly DetectedPort[],
  selectedPort: PortIdentifier | undefined,
  predicate: (detectedPort: DetectedPort) => boolean = () => true
): ReturnType<BoardsList['ports']> {
  const ports = allPorts.filter(predicate);
  const matchingIndex = findMatchingPortIndex(selectedPort, ports);
  return Object.assign(ports, { matchingIndex });
}

function collectPorts(
  items: readonly BoardsListItem[],
  detectedPorts: DetectedPorts
): DetectedPort[] {
  const allPorts: DetectedPort[] = [];
  // to keep the order or the detected ports
  const visitedPortKeys = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const { port } = items[i];
    const portKey = createPortKey(port);
    if (!visitedPortKeys.has(portKey)) {
      visitedPortKeys.add(portKey);
      const detectedPort = detectedPorts[portKey];
      if (detectedPort) {
        allPorts.push(detectedPort);
      }
    }
  }
  return allPorts;
}

function collectBoards(
  items: readonly BoardsListItem[]
): readonly BoardsListItemWithBoard[] {
  const result: BoardsListItemWithBoard[] = [];
  for (let i = 0; i < items.length; i++) {
    const boards: BoardsListItemWithBoard[] = [];
    const item = items[i];
    const { port } = item;
    const board = getInferredBoardOrBoard(item);
    if (board) {
      boards.push({ board, port });
    }
    if (isMultiBoardsBoardsListItem(item)) {
      for (const otherBoard of item.boards) {
        if (!boardIdentifierEquals(board, otherBoard)) {
          boards.push({ board: otherBoard, port });
        }
      }
    }
    boards.sort(BoardsListItemComparator);
    result.push(...boards);
  }
  return result;
}

function findSelectedIndex(
  boardsConfig: BoardsConfig,
  items: readonly BoardsListItem[]
): number {
  if (!isDefinedBoardsConfig(boardsConfig)) {
    return -1;
  }
  const length = items.length;
  const { selectedPort, selectedBoard } = boardsConfig;
  const portKey = createPortKey(selectedPort);
  // find the exact match of the board and port combination
  for (let index = 0; index < length; index++) {
    const item = items[index];
    const { board, port } = item;
    if (!board) {
      continue;
    }
    if (
      createPortKey(port) === portKey &&
      boardIdentifierEquals(board, selectedBoard)
    ) {
      return index;
    }
  }
  // find match from inferred board
  for (let index = 0; index < length; index++) {
    const item = items[index];
    if (!isInferredBoardsListItem(item)) {
      continue;
    }
    const { inferredBoard, port } = item;
    if (
      createPortKey(port) === portKey &&
      boardIdentifierEquals(inferredBoard, boardsConfig.selectedBoard)
    ) {
      return index;
    }
  }
  return -1;
}

function createBoardsListItemUI(
  detectedPort: DetectedPort,
  BoardsListHistory: BoardsListHistory
): BoardsListItemUI {
  const item = createBoardsListItem(detectedPort, BoardsListHistory);
  const labels = createBoardsListItemLabels(item);
  const defaultAction = createDefaultAction(item);
  const otherActions = createOtherActions(item);
  return Object.assign(item, { labels, defaultAction, otherActions });
}

function createBoardsListItem(
  detectedPort: DetectedPort,
  BoardsListHistory: BoardsListHistory
): BoardsListItem {
  const { port, boards } = detectedPort;
  // boards with arduino vendor should come first
  boards?.sort(boardIdentifierComparator);
  const portKey = createPortKey(port);
  const inferredBoard = BoardsListHistory[portKey];
  if (!boards?.length) {
    let unknownItem: BoardsListItem | InferredBoardsListItem = { port };
    // Infer unrecognized boards from the history
    if (inferredBoard) {
      unknownItem = {
        ...unknownItem,
        inferredBoard,
        type: 'manually-selected',
      };
    }
    return unknownItem;
  } else if (boards.length === 1) {
    const board = boards[0];
    let detectedItem: BoardsListItemWithBoard | InferredBoardsListItem = {
      port,
      board,
    };
    if (
      inferredBoard &&
      // ignore the inferred item if it's the same as the discovered board
      !boardIdentifierEquals(board, inferredBoard)
    ) {
      detectedItem = {
        ...detectedItem,
        inferredBoard,
        type: 'board-overridden',
      };
    }
    return detectedItem;
  } else {
    let ambiguousItem: MultiBoardsBoardsListItem | InferredBoardsListItem = {
      port,
      boards,
    };
    if (inferredBoard) {
      ambiguousItem = {
        ...ambiguousItem,
        inferredBoard,
        type: 'manually-selected',
      };
    }
    return ambiguousItem;
  }
}

function createDefaultAction(item: BoardsListItem): BoardsListItemAction {
  if (isInferredBoardsListItem(item)) {
    return createSelectAction({
      selectedBoard: item.inferredBoard,
      selectedPort: item.port,
    });
  }
  if (item.board) {
    return createSelectAction({
      selectedBoard: item.board,
      selectedPort: item.port,
    });
  }
  return createEditAction(item);
}

function createOtherActions(
  item: BoardsListItem
): BoardsListItemUI['otherActions'] {
  if (isInferredBoardsListItem(item)) {
    const edit = createEditAction(item);
    if (item.type === 'board-overridden') {
      const revert = createSelectAction({
        selectedBoard: item.board,
        selectedPort: item.port,
      });
      return { edit, revert };
    }
    return { edit };
  }
  return {};
}

function createSelectAction(
  params: SelectBoardsConfigActionParams
): SelectBoardsConfigAction {
  return {
    type: 'select-boards-config',
    params,
  };
}

function createEditAction(item: BoardsListItem): EditBoardsConfigAction {
  const params: Mutable<EditBoardsConfigActionParams> = {
    portToSelect: item.port,
  };
  if (isMultiBoardsBoardsListItem(item)) {
    const uniqueBoardName = findUniqueBoardName(item);
    params.query = uniqueBoardName ?? '';
    params.searchSet = item.boards;
  } else if (isInferredBoardsListItem(item)) {
    params.query = item.inferredBoard.name;
  } else if (item.board) {
    params.query = item.board.name;
  } else {
    params.query = '';
  }
  return {
    type: 'edit-boards-config',
    params,
  };
}

/**
 * (non-API)
 */
export const __tests = {
  nls,
};
