import { Minesweeper, GameIsOverException, PositionIsNotValidException } from './minesweeper.js'

let game = new Minesweeper()

const startGame = (
  width = 10,
  height = 10,
  mineCount = 10
) => {
  game.initGame(width, height, mineCount)
}

const getTile = (x, y) => {
  return game.getTileState(x, y)
}

const remainingMines = () => {
  return game.remainingMines
}

const tryOpenTile = (x, y) => {
  try {
    game.onTryOpenTile(x, y)
  } catch (e) {
    if (e instanceof GameIsOverException) {
      alert(e.message)
    } else if (e instanceof PositionIsNotValidException) {
      alert(e.message)
    }
  }
}

const tryFlagTile = (x, y) => {
  try {
    game.onTryFlagTile(x, y)
  } catch (e) {
    if (e instanceof GameIsOverException) {
      alert(e.message)
    } else if (e instanceof PositionIsNotValidException) {
      alert(e.message)
    }
  }
}

let DEBUG = true

if (DEBUG !== undefined) {
  startGame(10, 10, 10)
  console.log('Get tile on (3, 3):', getTile(3, 3))
  console.log('Open tile (3, 3)')
  tryOpenTile(3, 3)
  console.log('Try flag tile (5, 3)')
  tryFlagTile(5, 3)
}
