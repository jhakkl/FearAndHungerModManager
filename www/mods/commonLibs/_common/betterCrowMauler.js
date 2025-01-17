var MATTIE_RPG = MATTIE_RPG || {};

MATTIE.betterCrowMauler = MATTIE.betterCrowMauler || {};
/**
 *  @description the number of milliseconds util it is checked if crow mauler can spawn
 *  @default 10000
 * */
MATTIE.betterCrowMauler.spawnInterval = 10000;
/**
 *  @description the chance that crow mauler will spawn every interval
 *  @default .03
 * */
MATTIE.betterCrowMauler.spawnChance = 0.03;

/**
 *  @description the chance that crow mauler will follow you into the next room
 *  @default .2
 * */
MATTIE.betterCrowMauler.followChance = 0.15;

/**
 *  @description the chance that crow mauler will despawn when you leave a room
 *  @default .05
 * */
MATTIE.betterCrowMauler.despawnChance = 0.15;

/**
 * @description the chance of crow mauler entering someones battle
 * @default .005
 */
MATTIE.betterCrowMauler.combatEnterChance = 0.005;

/**
 * @description the min amount of time that must pass before crow can spawn in ms
 * @default 100 sec
 *
*/
MATTIE.betterCrowMauler.timeToSpawnMin = 100000;

MATTIE.betterCrowMauler.timeToSpawnMax = 10000000;
MATTIE.betterCrowMauler.timeScaler = (t) => (0.2 + (10 * (t / MATTIE.betterCrowMauler.timeToSpawnMax)));

/** @description a scaler to scale the crow's spawn chance by */
MATTIE.betterCrowMauler.scaler = 1;

/**
 * @author Mattie_FM
 */
MATTIE.betterCrowMauler.CrowController = class {
	constructor(params) {
		setTimeout(() => {
			this.disableBaseCrowMauler();
		}, 5000);

		this.timeElapsed = 0;

		/** @description whether this instance of the controller has spawned a crow mauler on this level */
		this.hasSpawned = false;

		/** @description whether a crow mauler has forced its way into this combat */
		this.inBattle = false;

		/** @description whether this instance of the controller's crow mauler is on screen or not  */
		this.onScreen = false;

		/** @description the id of the mapId crow mauler was spawned in last */
		this.mapId = 0;
		/**
		 * @description The current crow obj if spawned
		 * @type {MapEvent}
		 * */
		this.self = new MapEvent();

		const prevFunc = Game_Player.prototype.performTransfer;
		const that = this;
		Game_Player.prototype.performTransfer = function () {
			prevFunc.call(this);
			that.onEnterRoom();
			this.inBattle = false;
		};

		setInterval(() => {
			this.timeElapsed += MATTIE.betterCrowMauler.spawnInterval;
			if (this.crowCanSpawn()) {
				if ((!MATTIE.static.maps.onMenuMap())) { this.spawnTick(); }
				this.battleSpawnTick();
			}
		}, MATTIE.betterCrowMauler.spawnInterval);
	}

	/** @description whether this instance's crow mauler is dead */
	isDead() {
		const bool = this.self.checkSelfSwitch('A');
		console.log(`isdead: ${bool}`);
		return bool;
	}

	/** @description a function to return the scaler, meat to be overridden if other mods need to change this */
	getScaling() {
		return MATTIE.betterCrowMauler.scaler * MATTIE.betterCrowMauler.timeScaler(this.timeElapsed);
	}

	/**
	 * @description disable crow mauler
	 * @todo make sure this works properly
	 */
	disableBaseCrowMauler() {
		$gameSwitches.setValue(MATTIE.static.switch.crowMaulerDisabled, true);
	}

	/**
	 * @description the function called every x ms to check if crow mauler should spawn
	 */
	spawnTick() {
		if (!this.onScreen && !this.hasSpawned && !this.isDead() && !$gameParty.inBattle() && SceneManager._scene instanceof Scene_Map) this.update();
	}

	/**
	 * @description the function called every x ms to check if crow mauler should invade
	 */
	battleSpawnTick() {
		if (!this.isDead() && $gameParty.inBattle() && this.shouldEnterCombat() && !this.inBattle) {
			MATTIE.msgAPI.footerMsg('A terrifying presence has entered the room...');
			MATTIE.msgAPI.footerMsg('A terrifying presence is getting closer');

			setTimeout(() => {
				MATTIE.msgAPI.footerMsg('A terrifying presence is behind you');

				setTimeout(() => {
					this.invadeBattle();
				}, 35000);
			}, 5000);
		}
	}

	/**
	 * @description have crow mauler invade the current battle
	 * @param {*} net multiplayer only (fix this later)
	 */
	invadeBattle(net = false) {
		if ($gameParty.inBattle()) {
			this.inBattle = true;
			const additionalTroop = new MATTIE.troopAPI.RuntimeTroop(MATTIE.static.troops.crowMauler, 500, 0);
			additionalTroop.spawn(net);
		}
	}

	/**
	 * @description checks if crow mauler can spawn
	 * @returns {boolean}
	 */
	crowCanSpawn() {
		return $gameSwitches.value(MATTIE.static.switch.crowMaulerCanSpawn)
		&& !$gameSwitches.value(MATTIE.static.switch.crowMaulerDead)
		&& this.timeElapsed > MATTIE.betterCrowMauler.timeToSpawnMin;
	}

	/**
	 * @description get all possible entry or exit event tiles in the room
	 * @returns an array of every event that has an active transfer event in its list
	 */
	getAllTransferPointsOnMap() {
		let arr = [];
		if ($gameMap) {
			arr = $gameMap.events().filter((event) => {
				if (event.event()) {
					const page = event.event().pages[event._pageIndex];
					if (page) {
						return page.list.map((cmd) => cmd.code).includes(MATTIE.static.commands.transferId);
					}
					return false;
				}
				return false;
			});
		}

		return arr;
	}

	/**
	 * @description find the closest spawn point to a provided x and y
	 * @param {int} x;
	 * @param {int} y;
	 * @returns {Game_Event} the closest possible spawn point to the players current x and y
	 */
	findClosestSpawnPoint(x, y) {
		const spawnPoints = this.getAllTransferPointsOnMap();
		let closest = spawnPoints[0];
		if (closest) {
			let dist = MATTIE.util.getDist(x, closest.x, y, closest.y);
			for (let index = 1; index < spawnPoints.length; index++) {
			/** @type {Game_Event} */
				const element = spawnPoints[index];
				const thisDist = MATTIE.util.getDist(x, element.x, y, element.y);
				if (thisDist < dist) {
					if (MATTIE.isPassableAnyDir(element)) {
						dist = thisDist;
						closest = element;
					}
				}
			}
		}
		return closest;
	}

	/**
	 * @description create a new MapEvent for crow mauler. Does not spawn the event.
	 * @returns {MapEvent}
	 */
	createCrowObj() {
		const event = MATTIE.eventAPI.createEnemyFromExisting(53, 207, 2, 9);
		return event;
	}

	/**
	 * @description crow mauler enter the room
	 */
	enter() {
		MATTIE.msgAPI.footerMsg('A terrifying presence has entered the room...');
		this.spawn();
	}

	/**
	 * @description spawn the crow mauler event removing the previous one if it exists
	 */
	spawn() {
		this.timeElapsed = 0;
		if (!this.hasSpawned && !this.isDead() && !$gameParty.inBattle()) {
			this.onScreen = true;
			const spot = this.findClosestSpawnPoint($gamePlayer.x, $gamePlayer.y);
			if (spot) {
				this.self = this.createCrowObj();
				this.self.spawn(spot.x, spot.y);

				this.mapId = $gameMap.mapId();
				this.hasSpawned = true;
			}
		}
	}

	/**
	 * @description crow mauler follow player from last room to this room
	 */
	follow() {
		setTimeout(() => {
			MATTIE.msgAPI.footerMsg('A terrifying presence has followed you into the room...');
		}, 4000);
		setTimeout(() => {
			this.spawn();
		}, 6000);
	}

	/**
	 * @description checks if the crow mauler can follow the player, if the crow mauler was in the last room and rand chance.
	 *
	 */
	canFollow() {
		return MATTIE.util.randChance(MATTIE.betterCrowMauler.followChance * this.getScaling()) && (this.mapId === $gameMap.lastMapId());
	}

	/**
	 * @description checks a random chance to see if the crow should despawn
	 *
	 * */
	shouldDespawn() {
		return !this.isDead() && MATTIE.util.randChance(MATTIE.betterCrowMauler.despawnChance);
	}

	/**
	 * @description checks a random chance to see if the crow should appear in combat
	 *
	 * */

	shouldEnterCombat() {
		return !this.isDead() && !this.onScreen && MATTIE.util.randChance(MATTIE.betterCrowMauler.combatEnterChance * this.getScaling());
	}

	/**
	 * @description remove the current crow mauler event from the world
	 */
	despawn() {
		if (!this.isDead()) {
			this.self.removeThisEvent();
			this.hasSpawned = false;
		}
	}

	/**
	 * @description the function called to handle spawning logic every time the player enters a new room
	 */
	onEnterRoom() {
		if ($gameMap.mapId() != this.mapId) this.onScreen = false;
		if (!this.isDead() && !this.onScreen) {
			if (this.canFollow() && this.crowCanSpawn()) {
				this.despawn();
				this.follow();
			} else if (this.shouldDespawn()) {
				this.despawn();
			}
		}
	}

	/**
	 * @description the update method used to spawn crow mauler
	 */
	update() {
		console.log('updated');
		if (MATTIE.util.randChance(MATTIE.betterCrowMauler.spawnChance * this.getScaling())) {
			console.log('entered');
			this.enter();
		}
	}
};

/**
 * @description set up the crow mauler class and assign it to the variable we use
 */
MATTIE.betterCrowMauler.betterCrowMaulerInit = function () {
	const crowCont = new MATTIE.betterCrowMauler.CrowController();
	if (MATTIE.betterCrowMauler) { MATTIE.betterCrowMauler.crowCont = crowCont; }
};

/** @description cleanup the crow controller if it exists */
MATTIE.betterCrowMauler.betterCrowMaulerCleanup = function () {
	if (MATTIE.betterCrowMauler) { MATTIE.betterCrowMauler.crowCont = null; }
};

//--------------------------------------------------
// Multiplayer Compatibility
//--------------------------------------------------
MATTIE.betterCrowMauler.multiplayerCompatPRevFunc = MATTIE.betterCrowMauler.CrowController.prototype.getScaling;
if (MATTIE.multiplayer) {
	MATTIE.betterCrowMauler.CrowController.prototype.getScaling = function () {
		if (MATTIE.multiplayer.getCurrentNetController) {
			const netCont = MATTIE.multiplayer.getCurrentNetController();
			return 1 / Object.keys(netCont.netPlayers).length * MATTIE.betterCrowMauler.multiplayerCompatPRevFunc.call(this);
		}
		return MATTIE.betterCrowMauler.scaler;
	};
}
