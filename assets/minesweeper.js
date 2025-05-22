'use strict'

/**
 * 지뢰찾기 게임 초기화에 사용할 기본값 선언
 */
const DEFAULT_TILE_WIDTH = 100
const DEFAULT_TILE_HEIGHT = 100
const DEFAULT_MINE_COUNT = 5

/**
 * 각 타일의 조사 상태를 나타내는데 사용되는 플래그 열거형 선언
 */
const TileFlags = {
  DEFAULT: "default",
  OPEN: "open",
  FLAG: "flag",
  QUESTION: "question",
}

/**
 * 각 타일 상태 표현에 사용되는 클래스
 * 이후 게임 클래스가 2차원 MinesweeperTile 배열, (=Array<Array<MinesweeperTile>>) 형태로 사용함
 */
class MinesweeperTile {
  tileState = TileFlags.DEFAULT
  isMine = false
  constructor(tileState=TileFlags.DEFAULT, isMine=false) {
    this.tileState = tileState
    this.isMine = false
  }
}

/**
 * 게임 진행 중 발생 가능한 예외 상황 중 제어할 필요가 큰 예외 상황 정의
 * 
 * ~~Exception과 Error는 오류 처리를 위해 주로 사용합니다.
 * 시나리오를 벗어난 예외 상황에서 `throw new Error()`를 사용하여 예외를 발생시킬 수 있습니다.
 * return형과 이전 코드 상황으로 되롣아갑니다. 다만 return때와 같이 결과를 반환하지는 않아서,
 * try-catch문을 이용하여 예외를 처리해야 합니다.
 * https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/try...catch
 * https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
 */
class GameIsOverException extends Error {
  constructor(message) {
    super(message)
    this.name = "GameIsOverException"
  }
}

class PositionIsNotValidException extends Error {
  constructor(message) {
    super(message)
    this.name = "PositionIsNotValidException"
  }
}

/**
 * 메인 게임 제어 클래스
 */
class Minesweeper {
  // 클래스 속성
  width = DEFAULT_TILE_WIDTH
  height = DEFAULT_TILE_HEIGHT
  mines = DEFAULT_MINE_COUNT

  map = []
  minePositions = []
  _cachedMinePlacementQueue = []
  _cachedNearMineCounts = []

  // 생성자
  constructor(
    tileWidth = DEFAULT_TILE_WIDTH,
    tileHeight = DEFAULT_TILE_HEIGHT,
    mineCount = DEFAULT_MINE_COUNT
  ) {
    this.initGame(tileWidth, tileHeight, mineCount)
  }

  // 메서드
  /**
   * 아래의 메서드는 다양한 코드 스타일에서 공통적으로 채택하는 일부 코드 스타일을 따릅니다.
   * - 메서드는 익명 화살표 함수로 선언하여 클래스 속성에 바인딩합니다.
   * - 메서드 이름은 camelCase 스타일을 따릅니다.
   * - 외부에서 호출할 것으로 기대되는 함수의 이름은 언더스코어(_)로 시작하지 않습니다.
   *   클래스 내부적으로 코드 최적화를 위해 사용되는 메서드는 언더스코어(_)로 시작합니다.
   * 
   * 외부에서 내부에서 호출할 것으로 기대되는 메서드를 호출한다면, 예상치 못한 결과를 가져올 수 있습니다.
   * 예를 들어, onTryOpenTile() 메서드는 외부에서 호출할 것으로 기대되어 this.isPositionValid()
   * 메서드를 호출하여 매개변수로 전달된 좌표값의 유효성을 검사합니다.
   * 하지만 _openTile() 메서드는 매개변수로 전달된 좌표값이 유효하다고 가정하고 동작합니다.
   * 따라서 _openTile() 메서드를 외부에서 호출할 경우, 예외가 발생할 수 있습니다.
   */
  initGame = (
    tileWidth = DEFAULT_TILE_WIDTH,
    tileHeight = DEFAULT_TILE_HEIGHT,
    mineCount = DEFAULT_MINE_COUNT
  ) => {
    // 클래스의 속성 초기값 설정
    this.width = tileWidth
    this.height = tileHeight
    this.totalMines = mineCount
    this.findMines = 0
    this.remainFlags = mineCount
    this._cachedMinePlacementQueue = []
    this._cachedNearMineCounts = []
    this.minePositions = []

    // 게임 상태 초기화를 위해 선언한 내부 메서드 호출
    this._resetGameMap(tileWidth, tileHeight)
    this._placeMines(mineCount)
    this._cacheNearMineCount()
  }

  getRemainingMines = () => this.totalMines - this.findMines

  onTryFlagTile = (y, x) => {
    /**
     * 이 메서드는 매개변수로 주어지는 y, x 좌표의 타일에 플래그를 설정하려고 시도합니다.
     * 플래그 순서는 각각 DEFAULT -> FLAG -> QUESTION -> DEFAULT로 순환합니다.
     */
    if (!this.isPositionValid(y, x)) {
      return
      // throw new PositionIsNotValidException("Invalid position")
    }

    const targetedTileState = this.map[y][x].tileState
    if (targetedTileState === TileFlags.OPEN) {
      return
    }

    switch (targetedTileState) {
      case TileFlags.DEFAULT:
        this._setFlagTile(y, x)
        return
      case TileFlags.FLAG:
        this._removeFlagTile(y, x)
        this.map[y][x].tileState = TileFlags.QUESTION
        return
      case TileFlags.QUESTION:
        this.map[y][x].tileState = TileFlags.DEFAULT
        return
    }
  }

  _setFlagTile = (y, x) => {
    /**
     * y, x좌표에 플래그 설정을 시도하고, 그 결과 변경되어야 할 게임 상태를 설정합니다.
     * 만약 남은 플래그 설정 개수가 0이라면, y, x 좌표에 플래그를 설정하지 않습니다.
     */
    if (this.remainFlags <= 0) {
      return -1
    }
    this.remainFlags--
    this.map[y][x].tileState = TileFlags.FLAG
    if (this.map[y][x].isMine) {
      this.findMines++
    }
  }

  _removeFlagTile = (y, x) => {
    /**
     * y, x좌표에 플래그 해제를 시도하고, 그 결과 변경되어야 할 게임 상태를 설정합니다.
     */
    this.map[y][x].tileState = TileFlags.DEFAULT
    if (this.map[y][x].isMine) {
      this.findMines--
    }
    this.remainFlags++
  }

  onTryOpenTile = (y, x) => {
    /**
     * 이 메서드는 매개변수로 주어지는 y, x 좌표의 타일을 개방하려고 시도합니다.
     * 개방 시도 결과로 개방되는 타일의 좌표를 셋으로 반환합니다.
     * 즉, 만약 개방 시도에 실패했다면 빈 셋을 반환합니다.
     * 
     * 타일의 개방이 성공적으로 이루어지면, 해당 타일의 상태를 TileFlags.OPEN으로 변경합니다.
     * 인접 타일 개수가 0인 경우, 인접한 안전 타일을 전부 개방합니다.
     * 
     * 만약 타일이 지뢰인 경우, GameIsOverException 예외를 발생시킵니다.
     * 따라서 이 메서드의 호출부는 반드시 GameIsOverException 예외를 처리해야 합니다.
     */
    if (!this.isPositionValid(y, x)) {
      return new Set()
      // throw new PositionIsNotValidException("Invalid position")
    }

    if (this.map[y][x].isMine) {
      throw new GameIsOverException("Game is over")
    }

    if (this.map[y][x].tileState === TileFlags.DEFAULT) {
      return this._openTile(y, x)
    }
    return new Set()
  }

  _openTile = (y, x) => {
    /**
     * 이 메서드는 매개변수로 주어지는 y, x 좌표가 유효함을 가정하고 동작합니다.
     * 따라서 이 메서드를 호출하기 전 반드시 매개변수로 전달하는 좌표값에 대해 유효성 검사를 실시하여야 합니다.
     */

    /**
     * 이 메서드는 매개변수로 주어지는 y, x 좌표가 유효함을 가정하고 동작합니다.
     * 따라서 이 메서드를 호출하기 전 반드시 매개변수로 전달하는 좌표값에 대해 유효성 검사를 실시하여야 합니다.
     * 
     * 이 메서드는 매개변수로 주어지는 좌표를 기준으로 인접한 빈 타일을 모두 개방합니다.
     * 개방하는데 너비 우선 탐색(BFS) 알고리즘을 사용합니다.
     * 
     * 자세한 정보는 ()와 백준 온라인 저지의 ()번: 문제를 참고하세요.
     */
    
    const queue = []
    queue.push([y, x])
    const updatedTiles = new Set()

    while (queue.length > 0) {
      let now = queue.shift()
      let i = now[0]
      let j = now[1]
      
      updatedTiles.add([i, j])

      let tileState = this.map[i][j].tileState

      // 큐의 다음 값을 가져오기:
      if (tileState !== TileFlags.DEFAULT) {
        continue
      }

      this.map[i][j].tileState = TileFlags.OPEN
      // 현재 타일의 인접 지뢰 개수가 0이 아니라면 더 이상 개방하지 않음
      if (this._cachedNearMineCounts[i][j] !== 0) {
        continue
      }


      // 현재 타일을 기준으로 인접한 타일 중 아직 개방되지 않은 타일을 모두 큐에 추가
      // 큐에 추가된 타일은 다음 BFS 탐색에서 개방됨

      for (let dy of [-1, 0, 1]) {
        for (let dx of [-1, 0, 1]) {
          if (dy === 0 && dx === 0) { continue }
          
          let ny = i + dy
          let nx = j + dx
          if (!this.isPositionValid(ny, nx)) { continue }

          if (this.map[ny][nx].tileState === TileFlags.DEFAULT) {
            queue.push([ny, nx])
          }
        }
      }
    }
    
    return updatedTiles
  }

  getTileState = (y, x) => {
    /**
     * 타일 상태를 다음 규격으로 반환합니다.
     * {
     *   tile: {
     *     tileState: TileFlags,
     *     isMine: boolean
     *     (= MinesweeperTile 클래스의 속성)
     *   },
     *   nearMines: number
     * }
     */
    if (!this.isPositionValid(y, x)) {
      throw new Error("Invalid position")
    }
    return {
      tile: this.map[y][x],
      nearMines: this._cachedNearMineCounts[y][x],
    }
  }

  _resetGameMap = (width, height) => {
    /**
     * 게임 맵 데이터를 width, height 크기의 2차원 배열로 초기화합니다.
     */
    this.width = width
    this.height = height

    this.map = new Array()
    this._cachedMinePlacementQueue = []

    for (let i = 0; i < height; i++) {
      let row = new Array()
      for (let j = 0; j < width; j++) {
        row.push(new MinesweeperTile())
        this._cachedMinePlacementQueue.push([i, j])
      }
      this.map.push(row)
    }
  }

  _placeMines = (mineCount) => {
    /**
     * 지뢰를 랜덤하게 배치합니다.
     * 지뢰는 2차원 배열의 각 좌표에 대해 isMine 속성을 true로 설정하여 배치합니다.
     * 
     * 성능을 최적화하기 위해 큐(_cachedMinePlacementQueue)를 사용하여 지뢰를 배치합니다.
     * _resetGameMap() 메서드가 게임 맵을 초기화할 때, 전체 좌표를 지뢰 설치 가능한 후보 좌표군으로서
     * 큐(_cachedMinePlacementQueue)에 삽입했습니다.
     * 
     * 이 메서드에서는 큐가 담고 있는 값을 랜덤하게 섞은 후, 하나씩 pop하여 지뢰를 설치합니다.
     * 
     * 이렇게 함으로서 랜덤으로 좌표를 선택해
     *  (1) 선택한 좌표에 지뢰가 있는지 확인
     *  (2) 지뢰가 없다면 지뢰를 설치
     *  (3) 지뢰가 있다면 다시 랜덤으로 좌표를 선택
     * 하는 것보다 더 빠른 시간 안에 지뢰를 설치할 수 있습니다.
     * (같은 좌표를 여러번 선택하지 않음이 보장됩니다.)
     */
    this._cachedMinePlacementQueue.sort(() => Math.random() - 0.5)
    let placed = 0

    while (placed < mineCount) {
      const _now = this._cachedMinePlacementQueue.shift()
      const y = _now[0]
      const x = _now[1]

      this.map[y][x].isMine = true
      placed++

      this.minePositions.push(_now)
    }
  }

  _cacheNearMineCount = () => {
    this._cachedNearMineCounts = []

    /**
     * 이 부분 코드는 객체의 height, width에 의존하여 인접 지뢰 개수 캐시를 초기화함
     * 따라서 height, width 속성과 실제 map의 크기가 일치하지 않으면 버그가 발생할 수 있음
     * self.resetGameMap() 메서드에서 map 초기화 중 height, width를 함께 변경한 것처럼
     * 이후에 map의 크기를 변경해야하는 메서드를 작성해야 하는 경우, 이 두 속성도 함께 변경해야 함
     */
    // 지뢰 개수 캐시를 all zero 2D array로 초기화
    for (let i = 0; i < this.height; i++) {
      let row = []
      for (let j = 0; j < this.width; j++) {
        row.push(0)
      }
      this._cachedNearMineCounts.push(row)
    }

    // 각 좌표의 타일에 대해 인접 타일의 지뢰 개수 계산
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        for (let dy of [-1, 0, 1]) {
          for (let dx of [-1, 0, 1]) {
            if (dy === 0 && dx === 0) continue
            
            let ny = i + dy
            let nx = j + dx

            if (!this.isPositionValid(ny, nx)) continue

            if (this.map[i][j].isMine) {
              this._cachedNearMineCounts[ny][nx]++
            }
          }
        }
      }
    }
  }

  isPositionValid = (y, x) => {
    return (
      0 <= y && y < this.height &&
      0 <= x && x < this.width
    )
  }
}

export { Minesweeper, GameIsOverException, PositionIsNotValidException, TileFlags }
