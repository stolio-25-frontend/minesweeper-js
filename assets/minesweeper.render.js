import { Minesweeper, GameIsOverException, TileFlags } from './minesweeper.js'

const gameBodyRootElement = document.querySelector('#game-body')
const configWidthElement = document.querySelector('#config-width')
const configHeightElement = document.querySelector('#config-height')
const configMinesElement = document.querySelector('#config-mines')
const remainMinesElement = document.querySelector('#remain-mines')
const resetButtonElement = document.querySelector('#reset-button')

const gameManager = new Minesweeper()

const onResetButtonClick = () => {
  startGame()
  resetButtonElement.innerText = '😊'
}

const onTileInteract = () => {
  remainMinesElement.value = gameManager.remainFlags
}

const onTileClick = (y, x) => {
  try { 
    const res = gameManager.onTryOpenTile(y, x)
    for (let now of res) {
      const y = now[0]
      const x = now[1]
      
      const tileElement = document.querySelector(`#game-tile-${y}-${x}`)
      tileElement.classList.add('opened')
      
      let nearMines = gameManager.getTileState(y, x).nearMines
      if (nearMines === 0) {
        tileElement.innerText = ''
      } else {
        tileElement.innerText = nearMines
      }
    }
  } catch (e) {
    if (e instanceof GameIsOverException) {
      onGameOver()
    }
  }
  onTileInteract()
}

const onGameOver = () => {
  const tileElements = document.querySelectorAll('.game-tile')
  resetButtonElement.innerText = '😵'
  for (let tileElement of tileElements) {
    tileElement.removeEventListener('click', onTileClick)
    tileElement.removeEventListener('contextmenu', onTileContextMenu)
    tileElement.style.backgroundColor = 'red'
    tileElement.style.color = 'white'
  }
  for (let pos of gameManager.minePositions) {
    const y = pos[0]
    const x = pos[1]
    const tileElement = document.querySelector(`#game-tile-${y}-${x}`)
    tileElement.innerHTML = '<span class="material-icons">priority_high</span>'
  }
}

const onTileContextMenu = (element, y, x) => {
  gameManager.onTryFlagTile(y, x)
  let state = gameManager.map[y][x].tileState

  switch (state) {
    case TileFlags.DEFAULT:
      element.innerHTML = ''
      break
    case TileFlags.FLAG:
      element.innerHTML = '<span class="material-icons">flag</span>'
      break
    case TileFlags.QUESTION:
      element.innerHTML = '<span class="material-icons">question_mark</span>'
      break
  }
  onTileInteract()
}

const startGame = () => {
  const width = parseInt(configWidthElement.value)
  const height = parseInt(configHeightElement.value)
  const mines = parseInt(configMinesElement.value)

  gameManager.initGame(width, height, mines)

  renderGame()
}

const renderGame = () => {
  gameBodyRootElement.innerHTML = ''
  const gameMap = gameManager.map

  for (let i = 0; i < gameMap.length; i++) {
    const row = document.createElement('div')
    row.className = 'game-row'
    
    let rowString = ''
    for (let j = 0; j < gameMap[i].length; j++) {
      const tileString = `<div
        id="game-tile-${i}-${j}"
        class="game-tile"
        onclick="onTileClick(${i}, ${j})"
        oncontextmenu="event.preventDefault(); onTileContextMenu(this, ${i}, ${j}); return false;"
      ></div>`
      rowString += tileString
    }
    row.innerHTML = rowString
    gameBodyRootElement.appendChild(row)
  }
}

(() => {
  startGame()
  window.onResetButtonClick = onResetButtonClick
  window.onTileContextMenu = onTileContextMenu
  window.onTileClick = onTileClick
  configWidthElement.addEventListener('change', onResetButtonClick)
  configHeightElement.addEventListener('change', onResetButtonClick)
  configMinesElement.addEventListener('change', onResetButtonClick)
  resetButtonElement.addEventListener('click', onResetButtonClick)
})()
