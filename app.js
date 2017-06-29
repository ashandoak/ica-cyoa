(function Game(){
  "use strict";

  var viewportDims = {},
      scenario = document.getElementById('scenario'),
      action = document.getElementById('action'),
      options = document.getElementById('options'),
      detailContainer = document.getElementById('detail-container'),
      detailImageContainer = document.getElementById('detail-image'),
      detailTextContainer = document.getElementById('detail-text'),
      gameContainer = document.getElementById('game-container'),
      logoContainer = document.getElementById('logo-container'),

      score = document.getElementById('score'),

      chapterVal = parseInt(localStorage.getItem('chapter'),10),

  		gameState = {},

  		DEBUG = true;


  setupGame(chapterVal);

  function setupColorScheme(cv) {
    var cssColorRule = document.createElement("style");
    cssColorRule.type = "text/css";
    switch(cv) {
      case 1:
        cssColorRule.innerHTML = "body {color: #D4D4D4 !important; background-color: #202020 !important;} .buttonDisabledColor {color: #555;} .buttonEnabledColor {color: #f3901d;} .buttonEnabledColor:hover {color: #FF971E;}";
        break;
      case 2:
        cssColorRule.innerHTML = "body {color: #E1E1E1 !important; background-color: #646464 !important;} .buttonDisabledColor {color: #555;} .buttonEnabledColor {color: #f3901d;} .buttonEnabledColor:hover {color: #FF971E;}";
        break;
      case 3:
        cssColorRule.innerHTML = "body {color: #595959 !important; background-color: #FFFFFF !important;} .buttonDisabledColor {color: #555;} .buttonEnabledColor {color: #f3901d;} .buttonEnabledColor:hover {color: #FF971E;}";
        break;
    }
    document.body.appendChild(cssColorRule);
  }

  function createButton(data, div, enabled) {
    var s = document.createElement("span");

    if (typeof data === "string") { s.innerHTML = data; }
    else if (typeof data === "object") { s.innerHTML = data.option; }

    if (enabled) { s.classList.add("button", "buttonEnabledColor"); }
    else { s.classList.add("button", "buttonDisabledColor"); }

    if (enabled) {
      s.addEventListener("click", function() {
        if (typeof data === "object") {
          gameState.chosenOption = data;
          updateScore(data);
          if (gameState.currentChallenges.length === 0) {
            gameState.currentChallenges = chooseChallenges(gameState.chosenOption.data.challenges,gameState.currentScenario.challenges);
          }
        }
        requestAnimationFrame(advanceState);
      });
    }

    div.appendChild(s);
  }

  function createButtons(answerObj, div) {
    if (answerObj.length === 3) {
      var colSize = "col-sm-4";
    } else if (answerObj.length === 2) {
      var colSize = "col-sm-6";
    }

    var enableButton = true;

    for (let i=0; i < answerObj.length; i++) {
      var d = document.createElement("div");
      d.classList.add(colSize);

      if (answerObj[i].requirements && Object.keys(answerObj[i].requirements).length != 0) {
        for (var r in answerObj[i].requirements) {
          if ((r === "money" && answerObj[i].requirements[r] > gameState.money) ||
              (r === "cost" && answerObj[i].requirements[r]*gameState.family > gameState.money) ||
              (r === "family" && answerObj[i].requirements[r] > gameState.family) ||
              (r === "inventory" && answerObj[i].requirements[r] > gameState.inventory)) {
                enableButton = false;
          }
        }
      }

      createButton(answerObj[i], d, enableButton);

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

  function createPText(data, div) {
    if (typeof data === 'string') {
      let p = document.createElement("p");
      p.innerHTML = data;
      div.appendChild(p);
    } else if (typeof data === 'object') {
      var p = document.createElement("p");
      var spanA = document.createElement("span");
      var spanB = document.createElement("span");
      var button = document.createElement("button");

      spanA.innerHTML = data.textA;
      spanB.innerHTML = data.textB;
      button.innerHTML = data.textLink;
      button.addEventListener("click", function() {
        var di = new Image();
        di.onload = function() {
          detailImageContainer.src = this.src;
          detailTextContainer.innerHTML = data.detailText;
          detailContainer.classList.remove("hidden");
          resetAnim(detailContainer, 'fadeIn');
        };
        di.src = data.detailImage;
      })

      p.appendChild(spanA);
      p.appendChild(button);
      p.appendChild(spanB);

      div.appendChild(p);

    }
  }

  /*  displayScenario accepts an object that contains all
      question/options/data/response information for one round. It returns a
      promise generated from this object and resolves it on click. */
  function displayScenario(obj) {

    createPText(gameState.currentScenario.scenario, scenario);
    createPText(gameState.currentScenario.action, action);
    createButtons(gameState.currentScenario.answers, options);

  }


  function displayResponse(obj) {
    clearDiv([scenario,action,options]);
    //clear animation
    resetAnim(gameContainer, 'fadeIn');
    createPText(gameState.chosenOption.response, scenario);
    createButton("continue", action, true);
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
    if (DEBUG) { console.log("retrieving QB"); }
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
      if (gameState.chapter === 1) { document.body.classList.add('backgroundFade1to2'); }
      if (gameState.chapter === 2) { document.body.classList.add('backgroundFade2to3'); }
      setTimeout(function() {
          setupGame(gameState.chapter+1);
      }, 1500);
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
    var chapter = gameState.chapter;
    var logo;
    switch(chapter) {
      case 1:
        h1.innerHTML = "CHAPTER 1";
        logo = document.getElementById("ica-logo-o");
        break;
      case 2:
        h1.innerHTML = "CHAPTER 2";
        logo = document.getElementById("ica-logo-op");
        break;
      case 3:
        h1.innerHTML = "CHAPTER 3";
        logo = document.getElementById("ica-logo-opg");
        break;
    }
    logo.classList.remove("hidden");
    logoContainer.appendChild(h1);
    //resetAnim(logo, 'logoFadeIn');
    logo.classList.add('logoFadeIn');

    setTimeout(function() {
      logo.classList.add('logoFadeOut');
    }, 4000)

    setTimeout(function() {
      // clearDiv([logoContainer]);
      logoContainer.removeChild(h1);
      resetAnim(gameContainer, 'fadeIn');
      logo.classList.add("hidden");
      advanceState();
    }, 5000);
  }

  function setupGame(cv) {
    return Promise.all([setupColorScheme(cv), initGame(cv), retrieveQB(cv)])
		.then(introChapter);
	}

})();
