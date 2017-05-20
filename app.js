(function Game(){
  "use strict";

  var viewportDims = {},

		/*
    // Maybe use these to access div elements below, rather than vars
    $window = $(window),
		$document = $(document),
    */

    scenario = document.getElementById('scenario'),
    action = document.getElementById('action'),
    options = document.getElementById('options'),
    response = document.getElementById('response'),
    detailContainer = document.getElementById('detail-container'),
    detailImageContainer = document.getElementById('detail-image'),
    detailTextContainer = document.getElementById('detail-text'),
    gameContainer = document.getElementById('game-container'),

    score = document.getElementById('score'),

		orientationLocked = false,
		lockOrientation =
			(window.screen.lockOrientation ?
				window.screen.lockOrientation.bind(window.screen) : null
			) ||
			(window.screen.mozLockOrientation ?
				window.screen.mozLockOrientation.bind(window.screen) : null
			) ||
			(window.screen.msLockOrientation ?
				window.screen.msLockOrientation.bind(window.screen) : null
			) ||
			((window.screen.orientation && window.screen.orientation.lock) ?
				window.screen.orientation.lock.bind(window.screen.orientation) : null
			) ||
			null,

		gameState = {},

		touch_disabled = false,

		DEBUG = true;

	// initialize UI
	Promise.all([
		//Include function here for making sure document is loaded?
		//Include function here to make sure all external scripts are loaded?
		checkOrientation(),
	])
	//then for checking viewport and size?
	.then(setupGame);


	// respond to window resizes
  // NEEDED: onResize function
	//$window.on("resize",onResize);


  //Not entirely sure how this works... or if it works...
  function checkOrientation() {
		return Promise.resolve(
				lockOrientation ?
					lockOrientation("landscape") :
					Promise.reject()
			)
			.then(
				function onLocked() {
					orientationLocked = true;
				},
				function onNotLocked() {}
			);
	}

  function createPText(text, div) {
    var p = document.createElement("p");
    p.innerHTML = text;
    div.appendChild(p);
  }

  function createButtons(answerObj, div) {
    if (answerObj.length === 3) {
      var colSize = "col-sm-4";
    } else if (answerObj.length === 2) {
      var colSize = "col-sm-6";
    }

    for (let i=0; i < answerObj.length; i++) {
      var d = document.createElement("div");
      d.classList.add(colSize);
      var s = document.createElement("span");
      s.innerHTML = answerObj[i].option;
      s.classList.add("button");
      d.appendChild(s);
      //createPText(answerObj[i].option, d);
      if (answerObj[i].requirements) {
        for (var r in answerObj[i].requirements) {
          if ((r === "money" && answerObj[i].requirements[r] > gameState.money) ||
              (r === "cost" && answerObj[i].requirements[r]*gameState.family > gameState.money) ||
              (r === "family" && answerObj[i].requirements[r] > gameState.family) ||
              (r === "inventory" && answerObj[i].requirements[r] > gameState.inventory)) {
                s.classList.add("disabled");
          }
        }
      } else {
        s.addEventListener("click", function() {
          gameState.chosenOption = answerObj[i];
          updateScore(answerObj[i]);
          if (gameState.challenges.length === 0) {
            gameState.challenges = chooseChallenges(gameState.chosenOption.data.challenges,gameState.scenario.challenges);
          }
          requestAnimationFrame(advanceState);
        });
      }
      div.appendChild(d);
    }
  }

  function clearDiv(arr) {
    for (let i=0; i<arr.length; i++) {
      arr[i].innerHTML = "";
    }
  }

  function resetAnim(div, anim) {
    if (hasClass(div, anim)) {
      div.classList.remove("fadeIn");
      void div.offsetWidth;
      div.classList.add("fadeIn");
    }
  }

  function hasClass(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }

  //TEMPORARY DEBUG FUNCTION
  function updateScore(obj) {
    if (obj.data.family) {
      gameState.family += obj.data.family;
    }
    if (obj.data.money) {
      gameState.money += obj.data.money;
    }
    if (obj.data.cost) {
      gameState.money += obj.data.cost*gameState.family;
    }
    if (obj.data.inventory) {
      gameState.inventory += obj.data.inventory;
    }
    if (obj.data.challenges) {
      gameState.numChallenges = obj.data.challenges;
    }

    if (DEBUG) {
      console.log("Family: " + gameState.family + " Money: " + gameState.money + " Inventory: " + gameState.inventory);
    }
  }


  /*  displayScenario accepts an object that contains all
      question/options/data/response information for one round. It returns a
      promise generated from this object and resolves it on click. */
  function displayScenario(obj) {
    //generate the new promise based on the question
    createPText(gameState.scenario.scenario, scenario);
    createPText(gameState.scenario.action, action);
    createButtons(gameState.scenario.answers, options);

  }

  function displayResponse(obj) {
    clearDiv([scenario,action,options]);
    //clear animation
    resetAnim(gameContainer, 'fadeIn');
    createPText(gameState.chosenOption.response, scenario);
    var s = document.createElement("span");
    s.innerHTML = "Continue";
    s.classList.add("button");
    action.appendChild(s);

    s.addEventListener("click", function() {
      requestAnimationFrame(advanceState);
    });

    if (gameState.chosenOption.image != null) {
      var detailImage = new Image();
      detailImage.onload = function() {
        detailImageContainer.src = this.src;
        detailTextContainer.innerHTML = gameState.chosenOption.imageText;
        detailContainer.classList.remove("hidden");
        resetAnim(detailContainer, 'fadeIn');
      };
      detailImage.src = gameState.chosenOption.image;
    }
  }

  function chooseChallenges(numChallenges, challengeArr) {
    var arr = []
    while(arr.length < numChallenges){
        var randomnumber = Math.floor(Math.random()*challengeArr.length)
        arr[arr.length] = challengeArr.splice(randomnumber,1)[0];
    }
    return arr;
  }

  function initGame() {
    //use this space to call on the arrays from questionBank - or maybe put
    //it in a seperate function and use Promise.all in setupGame then this
    //becomes initGameState

    gameState.family = 5;
    gameState.money = 0;
    gameState.inventory = 0;
    gameState.numChallenges = 0;
    gameState.challengeCounter = 0;
    gameState.INVENTORY_MAX = 10;
    gameState.stateList = [startScenario, runScenario, displayScenario, displayResponse, completeScenario];

    gameState.winner = false;
    gameState.playEntering = false;
    gameState.playing = false;
    gameState.playLeaving = false;

    //not sure if I want this here or not
    gameState.iterator = -1;

    gameState.textElements = [];

    gameState.chosenOption = {};

    //NEEDED: state for max questions, and max eras?

    gameState.scenario = {};
    gameState.challenges = [];
  }

  function startScenario() {
    //set state
    gameState.playEntering = true;
    //gameState.challenges = [];

    if (gameState.challenges.length > 0) {
      //gameState.challenges = chooseChallenges(gameState.numChallenges,gameState.scenario.challenges);
      gameState.scenario = gameState.challenges.shift();
    } else {
      gameState.iterator++;
      //grab new object
      gameState.scenario = getNewScenario(questionBank);
    }

    //start run state
    //Does it make sense to pass this state parameter in? Or just use it as
    //a 'global'
    requestAnimationFrame(advanceState);

  }

  function runScenario(obj) {
    //async tasks - basically newState below
    gameState.playEntering = false;
    gameState.playing = true;

    requestAnimationFrame(advanceState);
  }

  //This isn't the right name for this function... Sounds too much like the
  //game is over
  function completeScenario() {
    gameState.playing = false;
    gameState.playLeaving = true;
    //clear div
    clearDiv([scenario,action,options,detailContainer]);
    //clear animation
    resetAnim(gameContainer, 'fadeIn');
    //save out object
    //[[TODO]]
    //save out state and send to data collection
    //[[TODO]]
    //call stateEnded?
    //check win conditions if (gameState.winner = true)... else:
    requestAnimationFrame(advanceState);

  }

  //necessary???
  function gameExit() {
    //check that everything is good
    //Start new state
  }

  //should I pass in the entire question bank, or part of it?
  function getNewScenario(qb) {
    return qb[gameState.iterator];
  }

  function advanceState() {

    if (typeof gameState.stateList != "undefined" && gameState.stateList.length > 0) {
      var stateFn = gameState.stateList.shift();
      stateFn();
    } else {
      gameState.stateList = [startScenario, runScenario, displayScenario, displayResponse, completeScenario];
      requestAnimationFrame(advanceState);
    }
  }

  function setupGame() {
    return Promise.resolve(initGame())
		.then(advanceState);
	}

})();
