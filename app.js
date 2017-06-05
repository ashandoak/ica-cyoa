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
    detailContainer = document.getElementById('detail-container'),
    detailImageContainer = document.getElementById('detail-image'),
    detailTextContainer = document.getElementById('detail-text'),
    gameContainer = document.getElementById('game-container'),

    score = document.getElementById('score'),

    chapterVal = parseInt(localStorage.getItem('chapter'),10),

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
	.then(setupGame(chapterVal));


	// respond to window resizes
  // NEEDED: onResize function
	//$window.on("resize",onResize);

  // function setupColorScheme(cv) {
  //   var cssColorRule = document.createElement("style");
  //   cssColorRule.type = "text/css";
  //   switch(cv) {
  //     case 2:
  //       cssColorRule.innerHTML = "body {color: #EEEEEE !important; background-color: #F4911E !important;} .buttonColor {color: #0079A7;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #1890C4;} .buttonDisabledColor:hover {color: #555;}";
  //       break;
  //     case 3:
  //       cssColorRule.innerHTML = "body {color: #FFFFFF !important; background-color: #98D819 !important;} .buttonColor {color: #69008B;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #A919D8;} .buttonDisabledColor:hover {color: #555;}";
  //       break;
  //     default:
  //       cssColorRule.innerHTML = "body {color: #D4D4D4 !important; background-color: #202020 !important;} .buttonColor {color: #438456;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #5DB877;} .buttonDisabledColor:hover {color: #555;}";
  //   }
  //   document.body.appendChild(cssColorRule);
  // }

  function setupColorScheme(cv) {
    var cssColorRule = document.createElement("style");
    cssColorRule.type = "text/css";
    switch(cv) {
      case 2:
        cssColorRule.innerHTML = "body {color: #D4D4D4 !important; background-color: #202020 !important;} .buttonColor {color: #438456;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #5DB877;} .buttonDisabledColor:hover {color: #555;}";
        break;
      case 3:
        cssColorRule.innerHTML = "body {color: #D4D4D4 !important; background-color: #202020 !important;} .buttonColor {color: #438456;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #5DB877;} .buttonDisabledColor:hover {color: #555;}";
        break;
      default:
        //background-image: url('ica-logo-orange.png'); background-repeat: no-repeat; background-size: 400px 400px;
        cssColorRule.innerHTML = "body {color: #D4D4D4 !important; background-color: #202020 !important;} .buttonColor {color: #438456;} .buttonDisabledColor {color: #555;} .buttonColor:hover {color: #5DB877;} .buttonDisabledColor:hover {color: #555;}";
    }
    document.body.appendChild(cssColorRule);
  }

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
      s.classList.add("button", "buttonColor");
      d.appendChild(s);
      //createPText(answerObj[i].option, d);
      if (answerObj[i].requirements && Object.keys(answerObj[i].requirements).length != 0) {
        for (var r in answerObj[i].requirements) {
          if ((r === "money" && answerObj[i].requirements[r] > gameState.money) ||
              (r === "cost" && answerObj[i].requirements[r]*gameState.family > gameState.money) ||
              (r === "family" && answerObj[i].requirements[r] > gameState.family) ||
              (r === "inventory" && answerObj[i].requirements[r] > gameState.inventory)) {
                s.classList.add("buttonDisabledColor");
          } else {
            s.addEventListener("click", function() {
              gameState.chosenOption = answerObj[i];
              updateScore(answerObj[i]);
              if (gameState.currentChallenges.length === 0) {
                gameState.currentChallenges = chooseChallenges(gameState.chosenOption.data.challenges,gameState.currentScenario.challenges);
              }
              requestAnimationFrame(advanceState);
            });
          }
        }
      } else {
        s.addEventListener("click", function() {
          gameState.chosenOption = answerObj[i];
          updateScore(answerObj[i]);
          if (gameState.currentChallenges.length === 0) {
            gameState.currentChallenges = chooseChallenges(gameState.chosenOption.data.challenges,gameState.currentScenario.challenges);
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
      div.classList.remove(anim);
      void div.offsetWidth;
      div.classList.add(anim);
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
    if (typeof gameState.currentScenario.scenario === 'string') {
      createPText(gameState.currentScenario.scenario, scenario);
    } else {
      var textA = gameState.currentScenario.scenario.textA;
      var textLink = gameState.currentScenario.scenario.textLink;
      var textB = gameState.currentScenario.scenario.textB;
      var detailImage = gameState.currentScenario.scenario.detailImage;
      var detailText = gameState.currentScenario.scenario.detailText;

      var p = document.createElement("p");
      var spanA = document.createElement("span");
      var spanB = document.createElement("span");
      var button = document.createElement("button");

      spanA.innerHTML = textA;
      spanB.innerHTML = textB;

      button.innerHTML = textLink;
      button.addEventListener("click", function() {
        var di = new Image();
        di.onload = function() {
          detailImageContainer.src = this.src;
          detailTextContainer.innerHTML = detailText;
          detailContainer.classList.remove("hidden");
          resetAnim(detailContainer, 'fadeIn');
        };
        di.src = detailImage;
      })

      p.appendChild(spanA);
      p.appendChild(button);
      p.appendChild(spanB);

      scenario.appendChild(p);

    }
    createPText(gameState.currentScenario.action, action);
    createButtons(gameState.currentScenario.answers, options);

  }

  function displayResponse(obj) {
    clearDiv([scenario,action,options]);
    //clear animation
    resetAnim(gameContainer, 'fadeIn');
    createPText(gameState.chosenOption.response, scenario);
    var s = document.createElement("span");
    s.innerHTML = "Continue";
    s.classList.add("button", "buttonColor");
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

  function initGame(chapter) {
    //use this space to call on the arrays from questionBank - or maybe put
    //it in a seperate function and use Promise.all in setupGame then this
    //becomes initGameState

    gameState.chapter = chapter;
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

    gameState.currentScenario = {};
    gameState.currentChallenges = [];

  }

  function retrieveQB(chapter) {
    console.log("retrieving QB");
    return new Promise(function(resolve, reject) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.open('GET','data.json');
      httpRequest.onload = function() {
        if (httpRequest.status >= 200 && httpRequest.status < 300) {
          var json = JSON.parse(httpRequest.responseText);
          gameState.questionBank = json.filter(function(row) {
            if (row.chapter === chapter) {
              return true;
            } else {
              return false;
            }
          })
          resolve();
        } else {
          reject({
              status: this.status,
              statusText: httpRequest.statusText
          });
        }
      };
      httpRequest.onerror = function() {
        reject({
          status: this.status,
          statusText: httpRequest.statusText
        });
      };
      httpRequest.send();
    });
  }

  function startScenario() {
    //set state
    gameState.playEntering = true;
    //gameState.currentChallenges = [];

    if (gameState.currentChallenges.length > 0) {
      //gameState.currentChallenges = chooseChallenges(gameState.numChallenges,gameState.currentScenario.challenges);
      gameState.currentScenario = gameState.currentChallenges.shift();
    } else {
      gameState.iterator++;
      //grab new object
      gameState.currentScenario = getNewScenario(gameState.questionBank);
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
    if (gameState.iterator >= gameState.questionBank.length-1) {
      gameExit();
    } else {
      requestAnimationFrame(advanceState);
    }
  }

  function gameExit() {
    if (gameState.chapter < 3) {
      gameState.chapter++;
      setupGame(gameState.chapter);
    } else {
      scenario.innerHTML = "You Win!"
      var a = document.createElement("a");
      a.innerHTML = "Return to beginning";
      a.setAttribute("href","index.html");
      options.appendChild(a);
    }
  }

  //should I pass in the entire question bank, or part of it?
  function getNewScenario(qb) {
    console.log(qb);
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

  function introChapter() {
    var h1 = document.createElement("h1");
    h1.innerHTML = "CHAPTER " + gameState.chapter.toString();
    scenario.appendChild(h1);
    scenario.setAttribute("style", "height: 400px; background-image: url('ica-logo-orange.png'); background-size: 400px; background-repeat: no-repeat; padding-top: 160px; padding-left: 100px;")

    resetAnim(gameContainer, 'fadeIn');

    setTimeout(function() {
      clearDiv([scenario]);
      scenario.setAttribute("style", "background-image: none;")
      advanceState();
    }, 3000);
  }

  function setupGame(cv) {
    //return Promise.resolve(initGame(localStorage.getItem('chapter')))
    return Promise.all([setupColorScheme(cv), initGame(cv), retrieveQB(cv)])
		.then(introChapter);
	}

})();
