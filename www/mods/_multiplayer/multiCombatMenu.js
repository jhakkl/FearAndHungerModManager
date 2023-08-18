var MATTIE = MATTIE || {};
MATTIE.multiplayer = MATTIE.multiplayer || {}
MATTIE.menus.multiplayer = MATTIE.menus.multiplayer || {};
MATTIE.scenes.multiplayer = MATTIE.scenes.multiplayer || {};
MATTIE.windows.multiplayer = MATTIE.windows.multiplayer || {};
MATTIE.multiplayer.multiCombat = {};
MATTIE.scenes.multiplayer.multiCombat = {};
MATTIE.windows.multiplayer.multiCombat = {};
MATTIE.windows.multicombat_SceneBattleOrg = Scene_Battle.prototype.createAllWindows;
MATTIE.multiplayer.multiCombat.netPlayerOffset = 0;

MATTIE.multiplayer.multiCombat.rowHeight = .1;
MATTIE.multiplayer.multiCombat.maxAlliesPerRow = 6;
MATTIE.multiplayer.multiCombat.minCharHeight = 50;

MATTIE.multiplayer.multiCombat.ellipseHor = MATTIE.multiplayer.multiCombat.maxAlliesPerRow;
MATTIE.multiplayer.multiCombat.ellipseVert = MATTIE.multiplayer.multiCombat.maxAlliesPerRow/1.5;
MATTIE.multiplayer.multiCombat.ellipseGetY = function (x){
    let b = MATTIE.multiplayer.multiCombat.ellipseVert;
    let a = MATTIE.multiplayer.multiCombat.ellipseHor;
    return Math.sqrt((1/b**2)+(((x**2)*b**2)/a**2)); //ellipse formula for y from x;
}


MATTIE.multiplayer.multiCombat.additionalStatusRows = 1;
MATTIE.multiplayer.multiCombat.additionalCommandRows = 1;

TextManager.multiplayer = "multiplayer"
TextManager.viewNextParty = "view next party"


Scene_Battle.prototype.createAllWindows = function() {
    MATTIE.windows.multicombat_SceneBattleOrg.call(this);

    this._textWindow = new MATTIE.windows.multiplayer.multiCombat.allyCount(0,0,155,75);
    this.addWindow(this._textWindow);

    this._partyDisplay = new MATTIE.windows.textDisplay(155,0,400,75,"Viewing: Self");
    this.addWindow(this._partyDisplay);

    this._readyDisplay = new Window_Selectable(0+this._textWindow.width,0,155,75);
    this._readyDisplay.drawText("Ready!",0,0,155,75)
    this._readyDisplay.setHandler('cancel', BattleManager.unready.bind(this));
    this.addWindow(this._readyDisplay);
    this._readyDisplay.hide();

    MATTIE.multiplayer.BattleController.addListener('ready', () =>{
        this._readyDisplay.show();
        this._readyDisplay.activate();
    })

    MATTIE.multiplayer.BattleController.addListener('unready', () =>{
        this._readyDisplay.hide();
        this._readyDisplay.deactivate();
    })

    MATTIE.multiplayer.getCurrentNetController().addListener('battleChange', () =>{
        this.refreshNetBattlers();
    })

    
    this.refreshNetBattlers();
};

Spriteset_Battle.prototype.removeNetBattler = function(index) {
    console.log("net battlers remove")
    if(!this._netActorSprites) this._netActorSprites = [];
    if(!this._netActors) this._netActors = [];
    var val = this._netActorSprites.splice(index,1)[0];
    this._netActors.splice(index,1);
    BattleManager._netActors.splice(index,1);
    console.log(this._battleField.removeChild(val));
}

Spriteset_Battle.prototype.addNetBattler = function(actor) {
    if(!this._netActorSprites) this._netActorSprites = [];
    if(!this._netActors) this._netActors = [];
    actor.forceIndex(this._netActorSprites.length);
    let sprite = new Sprite_Actor(actor);
    MATTIE.multiplayer.multiCombat.netPlayerOffset = $gameParty.battleMembers().length;
    if(MATTIE.multiplayer.devTools.shouldTint) {
        if(!MATTIE.multiplayer.devTools.consistentTint){
            MATTIE.multiplayer.devTools.consistentTint = MATTIE.multiplayer.devTools.getTint()
        }
        sprite._mainSprite.tint = MATTIE.multiplayer.devTools.consistentTint;
    }

    this._netActorSprites.push(sprite);
    BattleManager._netActors.push(actor);
    this._netActors.push(actor);
       
    this._battleField.addChild(this._netActorSprites[this._netActorSprites.length-1]);
}

Scene_Battle.prototype.refreshNetBattlers = function(){
    MATTIE.multiplayer.multiCombat.netPlayerOffset = $gameParty.battleMembers().length;
    let playersIds = MATTIE.multiplayer.currentBattleEvent.getIdsInCombatWith();
    let netCont = MATTIE.multiplayer.getCurrentNetController();
    if(!this._spriteset._netActorSprites) this._spriteset._netActorSprites = [];
    if(!this._spriteset._netActors) this._spriteset._netActors = [];
    for (let index = 0; index < this._spriteset._netActorSprites.length; index++) {
        this._spriteset.removeNetBattler(index);
    }
    playersIds.forEach(id => {
        if(id !== netCont.peerId){
            netCont.netPlayers[id].$gamePlayer.getBattleMembers().forEach(actor =>{
                this._spriteset.addNetBattler(actor);
            });
        }
    });
    this._spriteset.updateNetBattlers();
}


MATTIE.multiplayer.gameActorInit = Game_Actor.prototype.initMembers;
Game_Actor.prototype.initMembers = function() {
    MATTIE.multiplayer.gameActorInit.call(this);
    this._forcedIndex = null;
}
Game_Actor.prototype.index = function() {
    console.log(this._forcedIndex);
    if(this._forcedIndex != null) return this._forcedIndex 
    else return $gameParty.members().indexOf(this);
};

Game_Actor.prototype.forceIndex = function(index) {
    console.log(index);
    this._forcedIndex = index;
    console.log(this._forcedIndex);
};

Game_Actor.prototype.unForceIndex = function() {
    this._forcedIndex =null;
};

Spriteset_Battle.prototype.updateNetBattlers = function(){
    if(!this._netActorSprites) this._netActorSprites = [];
    if(!this._netActors) this._netActors = [];
    var members = this._netActors;
    for (var i = 0; i < this._netActorSprites.length; i++) {
        this._netActorSprites[i].setBattler(members[i]);
    }
}

MATTIE.multiplayer.spiresetBattleUpdate = Spriteset_Battle.prototype.update;
Spriteset_Battle.prototype.update = function(){
    MATTIE.multiplayer.spiresetBattleUpdate.call(this);
    this.updateNetBattlers();
}

Sprite_Actor.prototype.setActorHome = function (index) {
    index += MATTIE.multiplayer.multiCombat.netPlayerOffset;
    console.log(MATTIE.multiplayer.multiCombat.netPlayerOffset);
    let colNum = index % MATTIE.multiplayer.multiCombat.maxAlliesPerRow;
    let rowNum = Math.floor(index/MATTIE.multiplayer.multiCombat.maxAlliesPerRow)
    
    let xOffset = (Graphics.width / MATTIE.multiplayer.multiCombat.maxAlliesPerRow) * colNum;
    let x = colNum- MATTIE.multiplayer.multiCombat.maxAlliesPerRow/2;
    let y = MATTIE.multiplayer.multiCombat.ellipseGetY(x);
    let rowOffset = (rowNum * MATTIE.multiplayer.multiCombat.rowHeight * Graphics.height);
    let yOffset = (y * MATTIE.multiplayer.multiCombat.rowHeight * Graphics.height);
    this.setHome(50+xOffset, Graphics.boxHeight-MATTIE.multiplayer.multiCombat.minCharHeight-rowOffset-yOffset);
}

MATTIE.windows.multiplayer.multiCombat.allyCount = function () {
    this.initialize.apply(this, arguments);
}

MATTIE.windows.multiplayer.multiCombat.allyCount.prototype = Object.create(MATTIE.windows.textDisplay.prototype);
MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.constructor = MATTIE.windows.multiplayer.multiCombat.allyCount;

MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.initialize = function(x, y, width, height) {
    this._items = [];
    this._index = 0;
    this._header = "";
    MATTIE.windows.textDisplay.prototype.initialize.call(this, x, y, width, height, MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.getText());
    MATTIE.multiplayer.getCurrentNetController().addListener('battleChange', () =>{
        this.updateCount();
    })
};
MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.getText = function(){
    return("Allies: "+ MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.getTotalAllies()).toString();
}

MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.getTotalAllies = function() {
    var x = MATTIE.multiplayer.currentBattleEvent.totalCombatants();
    return ((x?x:0)-1);
}

MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.updateCount = function(){
    this.updateText(MATTIE.windows.multiplayer.multiCombat.allyCount.prototype.getText());
}




//spritesets
function Spriteset_Battle_ActorRow() {
    this.initialize.apply(this, arguments);
}

Spriteset_Battle_ActorRow.prototype = Object.create(Spriteset_Base.prototype);
Spriteset_Battle_ActorRow.prototype.constructor = Spriteset_Battle_ActorRow;

Spriteset_Battle_ActorRow.prototype.initialize = function() {
    Spriteset_Base.prototype.initialize.call(this);
    this.maxActors = 6;
};

Spriteset_Battle_ActorRow.prototype.createBaseSprite = function() {
    this._baseSprite = new Sprite();
    this._baseSprite.setFrame(0, 0, this.width, this.height);
    this._blackScreen = new ScreenSprite();
    this._blackScreen.opacity = 0;
    this.addChild(this._baseSprite);
    this._baseSprite.addChild(this._blackScreen);
};

Spriteset_Battle_ActorRow.prototype.createLowerLayer = function() {
    Spriteset_Base.prototype.createLowerLayer.call(this);
    this.createBattleField();
    this.createActors($gameActors);
};

Spriteset_Battle_ActorRow.prototype.update = function() {
    Spriteset_Base.prototype.update.call(this);
    this.updateActors($gameActors);
};

Spriteset_Battle_ActorRow.prototype.createBattleField = function() {
    var width = Graphics.boxWidth;
    var height = Graphics.boxHeight;
    var x = (Graphics.width - width) / 2;
    var y = (Graphics.height - height) / 2;
    this._battleField = new Sprite();
    this._battleField.setFrame(x, y, width, height);
    this._battleField.setColorTone([255,0,0,1])
    this._battleField.x = x;
    this._battleField.y = y;
    this._baseSprite.addChild(this._battleField);
};

Spriteset_Battle_ActorRow.prototype.createActors = function() {
    this._actorSprites = [];
    for (var i = 0; i < 6; i++) {
        this._actorSprites[i] = new Sprite_Actor();
        this._battleField.addChild(this._actorSprites[i]);
    }
};

Spriteset_Battle_ActorRow.prototype.updateActors = function() {
    
    var members = $gameActors._data;
    for (var i = 0; i < this._actorSprites.length; i++) {
        this.setBattlerPos(this._actorSprites[i], members[i], i);
    }
};


Spriteset_Battle_ActorRow.prototype.setBattlerPos = function (sprite, battler, index) {
    sprite.setBattler(battler);
    var changed = (battler !== this._actor);
    if (changed) {
        sprite._actor = battler;
        if (battler) {
            sprite.setHome(300 + index * 16, 280 + index * 48);
        }
        sprite.startEntryMotion();
        sprite._stateSprite.setup(battler);
    }
}


Spriteset_Battle_ActorRow.prototype.validFog = function (id){
    return false;
}

MATTIE.multiplayer.multiCombat.maxItems = Window_BattleStatus.prototype.maxItems;
Window_BattleStatus.prototype.maxItems = function() {
    return MATTIE.multiplayer.multiCombat.maxItems.call(this) + MATTIE.multiplayer.multiCombat.additionalStatusRows;
    
};
MATTIE.multiplayer.multiCombat.numVisibleRows = Window_BattleStatus.prototype.numVisibleRows;
Window_BattleStatus.prototype.numVisibleRows = function() {
    let numRows = MATTIE.multiplayer.multiCombat.numVisibleRows.call(this);
    if(this.maxItems() + MATTIE.multiplayer.multiCombat.additionalStatusRows > numRows){
        return numRows + MATTIE.multiplayer.multiCombat.additionalStatusRows;
    }else{
        return numRows;
    }
};


Window_BattleStatus.prototype.drawTextItem = function(index, text){
    let rect = this.basicAreaRect(index);
    this.drawTitleText(text, rect.x + 0, rect.y, 150);
}

Window_BattleStatus.prototype.setGameParty = function(party){
    this._gameParty = party;
}

Window_BattleStatus.prototype.drawTitleText = function(text, x, y, width) {
    width = width || 168;
    this.drawText(text, x, y, width);
};

Window_BattleStatus.prototype.drawItem = function(index) {
    let gameParty = this._gameParty || $gameParty;
    var actor = gameParty.battleMembers()[index];
    this.drawBasicArea(this.basicAreaRect(index), actor);
    this.drawGaugeArea(this.gaugeAreaRect(index), actor);
};

MATTIE.multiplayer.multiCombat.drawItem = Window_BattleStatus.prototype.drawItem;
Window_BattleStatus.prototype.drawItem = function(index) {

    if(index < MATTIE.multiplayer.multiCombat.maxItems()){ //if non extended row
        MATTIE.multiplayer.multiCombat.drawItem.call(this, index);
    }else{ //if extended row
       this.drawTextItem(index,TextManager.viewNextParty)
    }


};

// MATTIE.multiplayer.Window_BattleStatusDrawAll = Window_BattleStatus.prototype.drawAllItems;
// Window_BattleStatus.prototype.drawAllItems = function (){
//     MATTIE.multiplayer.Window_BattleStatusDrawAll.call(this);
//     this.drawText("party",0,0,200);
// }




MATTIE.multiplayer.multiCombat.numVisibleRowsActorCommand = Window_ActorCommand.prototype.numVisibleRows;
Window_ActorCommand.prototype.numVisibleRows = function() {
    return MATTIE.multiplayer.multiCombat.numVisibleRowsActorCommand.call(this) + MATTIE.multiplayer.multiCombat.additionalCommandRows;
};

MATTIE.multiplayer.multiCombat.window_actorcommandMakeCommandList=Window_ActorCommand.prototype.makeCommandList;
Window_ActorCommand.prototype.makeCommandList = function() {
    MATTIE.multiplayer.multiCombat.window_actorcommandMakeCommandList.call(this);
    if (this._actor) {
        this.addMultiplayerCommand();
    }
}

Window_ActorCommand.prototype.addMultiplayerCommand = function(){
    this.addCommand(TextManager.multiplayer, 'multiplayer');
}
Scene_Battle.prototype.resetParty = function() {
    this._partyDisplay.updateText("Viewing: Self")
    this._actorWindow.setGameParty(null);
    this._statusWindow.setGameParty(null);
    this._actorWindow.currentid = 0;
}

Scene_Battle.prototype.viewNetParty = function(n) {
    let playersIds = MATTIE.multiplayer.currentBattleEvent.getIdsInCombatWithExSelf();
    let netCont = MATTIE.multiplayer.getCurrentNetController();
    this._actorWindow.setGameParty(netCont.netPlayers[playersIds[n]]);
    this._statusWindow.setGameParty(netCont.netPlayers[playersIds[n]]);
    this._partyDisplay.updateText("Viewing: " + netCont.netPlayers[playersIds[n]].name);
}

Scene_Battle.prototype.refreshParties = function(){
    this._actorWindow.refresh();
    this._statusWindow.refresh();
}


Scene_Battle.prototype.shiftParty = function() {
    let playersIds = MATTIE.multiplayer.currentBattleEvent.getIdsInCombatWithExSelf();
   let netCont = MATTIE.multiplayer.getCurrentNetController();
   console.log(playersIds);
    if(this._actorWindow._gameParty == netCont.netPlayers[playersIds[playersIds.length-1]]){
        this.resetParty();
   }else{
        if(!this._actorWindow.currentid) this._actorWindow.currentid =0;
        this.viewNetParty(this._actorWindow.currentid);
        this._actorWindow.currentid++;
   }
   console.log("ShiftedParty");
}

Scene_Battle.prototype.multiplayerCmd = function() {
     let playersIds = MATTIE.multiplayer.currentBattleEvent.getIdsInCombatWith();
    let netCont = MATTIE.multiplayer.getCurrentNetController();
    this._actorWindow.setGameParty(netCont.netPlayers[playersIds[1]]);
    this._statusWindow.setGameParty(netCont.netPlayers[playersIds[1]]);
    console.log(this._actorWindow._gameParty);
    console.log("multiplayer active");
}

MATTIE.multiplayer.sceneBattleOk = Scene_Battle.prototype.onActorOk;
Scene_Battle.prototype.onActorOk = function() {
    console.log(this._actorWindow.index());
    if(this._actorWindow.index()+1 <= MATTIE.multiplayer.multiCombat.maxItems.call(this._actorWindow)){
        MATTIE.multiplayer.sceneBattleOk.call(this);
        this.resetParty();
        this.refreshParties();
    }else{
        
        this.shiftParty();
        this.selectActorSelection();
        console.log("custom command selected")
    }
};


MATTIE.multiplayer.sceneBattleCreateCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
Scene_Battle.prototype.createActorCommandWindow = function() {
    MATTIE.multiplayer.sceneBattleCreateCommandWindow.call(this);
    this._actorCommandWindow.setHandler('multiplayer', this.shiftParty.bind(this));
}


Window_BattleActor.prototype.hide = function() {
    let gameParty = this._gameParty || $gameParty;
    Window_BattleStatus.prototype.hide.call(this);
    gameParty.select(null);
};

Window_BattleActor.prototype.select = function(index) {
    let gameParty = this._gameParty || $gameParty;
    Window_BattleStatus.prototype.select.call(this, index);
    gameParty.select(this.actor());
};

Window_BattleActor.prototype.actor = function() {
    let gameParty = this._gameParty || $gameParty;
    return gameParty.members()[this.index()];
};