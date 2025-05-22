# Minesweeper.js

HTML + CSS + JavaScript 지뢰찾기 구현체 예제입니다.

- index.html  
    지뢰찾기 게임을 보여주는 HTML 페이지입니다. 이 페이지의 HTML 구조를 assets/minesweeper.render.js가 이용하여 지뢰찾기 게임을 렌더링합니다.
- assets/minesweeper.js  
    지뢰찾기 게임을 시뮬레이션하는 Minesweeper 클래스와 부속 데이터타입을 정의합니다. 이 클래스는 다른 코드와 독립적으로 사용할 수 있으므로, 다른 자바스크립트 코드나 명령줄 인터프리터 환경에서도 UI 없이 사용할 수 있습니다.
    ```js
    import Minesweeper from './minesweeper.js'

    let game = new Minesweeper()
    game.init(15, 15, 5)  // 15x15 격자에 5개의 지뢰를 배치합니다.
    game.onTryOpenTile(0, 0)  // (y=0, x=0) 좌표의 타일을 엽니다.
    ```
- assets/minesweeper.render.js
    minesweeper.js에 선언된 지뢰찾기 게임 시뮬레이션을 HTML에 바인딩합니다. 
- assets/minesweeper.test.js
    지뢰찾기 게임 시뮬레이션을 테스트하는 코드입니다. 이 코드는 HTML과는 독립적으로 동작합니다.

## 그래서 어떤 파일을 보아야 하나요?
- 게임 로직을 어떻게 짜죠? >> [assets/minesweeper.js](./assets/minesweeper.js)
- 사용자-게임 상호작용 처리를 어떻게 하죠? >> [assets/minesweeper.render.js](./assets/minesweeper.render.js)
- minesweeper.js의 사용법을 알고 싶어요 >> [assets/minesweeper.test.js](./assets/minesweeper.test.js)
