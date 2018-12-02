RocketBoots.loadComponents([
	// "PIXI",
	"Game",
	"Coords",
	"StateMachine",
	"Dice",
	// "Entity",
	"Loop",
	// "Stage",
	// "World",
	// "Keyboard",
	// "Color",
	// "GameImage",
	// "Spritesheet"
	//"ImageBank"
]).ready(function(){

	return;

	const TILE_SIZE = 16;
	const SPRITESHEET_URL = "images/scroll-o-sprites_spritesheet.png";
	const states = {};
	const keyActions = {
		wasd: true,
		keyDownActions: {
			"UP": planToMoveHeroUp,
			"DOWN": planToMoveHeroDown,
			"LEFT": planToMoveHeroLeft,
			"RIGHT": planToMoveHeroRight,
			"SPACE": planToWait,
			"=": zoomIn,
			"+": zoomIn,
			"-": zoomOut
		}
	};
	const PIXI = RocketBoots.PIXI;

	const g = new RocketBoots.Game({
		name: "L7D",
		instantiateComponents: [
			{"state": "StateMachine", "options": {"states": states}},
			//{"loop": "Loop"},
			{"dice": "Dice"},
			//{"world": "World", "options": worldOptions},
			//{"stage": "Stage", "options": stageOptions},
			//{"images": "ImageBank"},
			{"keyboard": "Keyboard"}
		],
		version: "v0.0.0"
	});

	g.colors = {
		// Based on a desaturated (-36) version of the pico-8 color palette
		// https://www.romanzolotarev.com/pico-8-color-palette/
		black: 		new RocketBoots.Color(0, 0, 0),
		darkBlue: 	new RocketBoots.Color(45, 50, 75),
		darkPurple: new RocketBoots.Color(111, 57, 83),
		darkGreen: 	new RocketBoots.Color(24, 110, 77),
		brown: 		new RocketBoots.Color(149, 95, 77),
		darkGray: 	new RocketBoots.Color(92, 87, 82),
		lightGray: 	new RocketBoots.Color(194, 195, 197),
		white: 		new RocketBoots.Color(250, 241, 235),
		red: 		new RocketBoots.Color(214, 69, 100),
		orange: 	new RocketBoots.Color(210, 152, 53),
		yellow: 	new RocketBoots.Color(214, 205, 83),
		green: 		new RocketBoots.Color(41, 188, 80),
		blue: 		new RocketBoots.Color(96, 164, 220),
		indigo: 	new RocketBoots.Color(133, 123, 147),
		pink: 		new RocketBoots.Color(230, 143, 173),
		peach: 		new RocketBoots.Color(238, 206, 184),
		scrollOSprites: new RocketBoots.Color(238 /* 236? */, 238, 204 /* 203? */)
	};

	g.zoom = 2;
	g.app = createPixiApp();
	g.center = getCenter(g.app);
	g.worldContainer = createWorldContainer(g.app, g.center);
	g.containers = createContainers(g.worldContainer, [
		"ground",
		"terrain",
		"fixtures",
		"items",
		"npcs",
		"monsters",
		"hero",
		"weather"
	]);
	// Data that's not setup yet
	g.terrainTypeImages = {};
	g.hero = null;
	g.monsters = [];
	g.spritesheet = null;
	g.world = null;
	// Load
	loader([
		SPRITESHEET_URL
		// "images/dirt.png",
		// "images/dirt_wall.png",
	]).then(startGame);

	//g.state.transition("setup");

	g.round = 0;

	window.g = g;
	console.log(g);
	return g;

	function startGame() {
		g.keyboard.start(keyActions);
		g.spritesheet = createSpritesheet();
		g.world = createWorld();
		g.spritesheet.loaded.then((spritesheet) => {
			g.terrainTypeImages = createTerrainTypeImages(spritesheet);
			g.hero = createNewCharacter(spritesheet);
			g.monsters = createMonsters(spritesheet);
			hideBackgroundTiles();
		});
		
		g.app.ticker.add(tick);
	}

	function createWorld() {
		return wogen.createWorld();
	}

	function createTerrainTypeImages(spritesheet) {
		const terrTypeImages = {
			"W": spritesheet.getImageCopy("ocean"),
			"P": spritesheet.getImageCopy("grass"),
			"F": spritesheet.getImageCopy("tree"),
			"M": spritesheet.getImageCopy("stones"),
			"D": spritesheet.getImageCopy("dirt"),
			"C": spritesheet.getImageCopy("small-plant")
		};
		terrTypeImages["W"].replaceColor(g.colors.scrollOSprites, g.colors.blue);
		terrTypeImages["P"].replaceColor(g.colors.scrollOSprites, g.colors.darkGreen);
		terrTypeImages["F"].replaceColor(g.colors.scrollOSprites, g.colors.green);
		terrTypeImages["M"].replaceColor(g.colors.scrollOSprites, g.colors.lightGray);
		terrTypeImages["D"].replaceColor(g.colors.scrollOSprites, g.colors.brown);
		terrTypeImages["C"].replaceColor(g.colors.scrollOSprites, g.colors.brown);
		const tileSize = getZoomedTileSize();
		g.world.loopOverTerrain((terrain) => {
			const image = terrTypeImages[terrain.typeKey];
			terrain.tile = new RocketBoots.Tile({
				pos: new RocketBoots.Coords(terrain.x, terrain.y),
				sprite: image.createPixiSprite(),
				tileSize: getZoomedTileSize()
			});
			g.containers.terrain.addChild(terrain.tile.sprite);
		});
		return terrTypeImages;
	}

	function createNewCharacter(spritesheet) {
		const heroGameImage = spritesheet.getImageCopy("wizard-man");
		//heroGameImage.replaceColor(g.colors.scrollOSprites, g.colors.blue);
		const hero = new RocketBoots.Character({
			name: "Hero",
			sprite: heroGameImage.createPixiSprite(),
			tileSize: getZoomedTileSize(),
			ai: null
		});
		g.containers.hero.addChild(hero.sprite);

		//g.app.stage.addChild(heroGameImage.pixiSprite);
		//g.app.renderer.render(g.app.stage);
		return hero;
	}

	function createMonsters(spritesheet) {
		let i = 100;
		const gameImage = spritesheet.getImageCopy("bat");
		const min = g.world.getMinCoords();
		const max = g.world.getMaxCoords();
		const monsters = [];
		while(i-- > 0) {
			const randomPosition = new RocketBoots.Coords(
				g.dice.getRandomIntegerBetween(min.x, max.x),
				g.dice.getRandomIntegerBetween(min.y, max.y)
			);
			const monster = new RocketBoots.Character({ 
				name: 'Monster',
				pos: randomPosition,
				sprite: gameImage.createPixiSprite(),
				tileSize: getZoomedTileSize(),
				ai: "beast"
			});
			monsters.push(monster);
			g.containers.npcs.addChild(monster.sprite);
		}
		return monsters;
	}

	function createPixiApp() {
		const $window = $(window);
		const canvasContainerElt = document.getElementById("pixi-view");
		const $canvasContainer = $(canvasContainerElt);
		// const pixiTextureCache = PIXI.utils.TextureCache;
		// const grid = new Grid({
		// 	x: GRID_SIZE_X, y: GRID_SIZE_Y, 
		// 	groundY: Math.round(GRID_SIZE_Y/3),
		// 	pixelsPerGridUnit: PIXELS_PER_GRID_UNIT
		// });

		// let colorFilter = new PIXI.filters.ColorMatrixFilter();
		// colorFilter.matrix = [
		// 	//R  G  B  A
		// 	1, 0, 0, 0,
		// 	0, 1, 0, 0,
		// 	0, 0, 1, 0,
		// 	0, 0, 0, 1
		// ];

		const app = new PIXI.Application({
			width: 640, // 576, // $canvasContainer.width(),
			height: 640, // 576, //$canvasContainer.height(),
			transparent: true,
			antialias: false,
			roundPixels: true
		});
		PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
		canvasContainerElt.appendChild(app.view);

		return app;
	}

	function getCenter(pixiApp) {
		return RocketBoots.Coords((pixiApp.renderer.width / 2), (pixiApp.renderer.height / 2));
	}

	function createWorldContainer(app, center) {
		const worldContainer = new PIXI.Container();
		app.stage.addChild(worldContainer);
		worldContainer.x += center.x;
		worldContainer.y += center.y;
		return worldContainer;
	}

	function createContainers(worldContainer, containerNames) {
		const containers = {};
		_.each(containerNames, (containerName) => {
			if (containerName === "smoke" || containerName === "snow") {
				containers[containerName] = new PIXI.particles.ParticleContainer(5000, {alpha: true})
			} else {
				containers[containerName] = new PIXI.Container();
			}
			worldContainer.addChild(containers[containerName]);
		});
		return containers;
	}

	function createSpritesheet() {

		// 23 + 15 high x 16 = 608px
		// 16 wide x 16 = 256px
		const spritesheet = new RocketBoots.Spritesheet({
			url: SPRITESHEET_URL,
			spriteSize: {x: 16, y: 16},
			spriteKeys: scroll_o_sprites.keys
		});
		console.log(spritesheet);
		return spritesheet;
	}

	function loader() {
		return new Promise((resolve, reject) => {
			//	23 + 15 high x 16 = 608px
			//	16 wide x 16 = 256px
			PIXI.loader
				.add([
					SPRITESHEET_URL
					// "images/dirt.png",
					// "images/dirt_wall.png",
					// "images/empty.png",
					// "images/man.png",
					// "images/man_resting.png",
					// "images/woman.png",
					// "images/mutant.png",
					// "images/dead_man.png",
					// "images/fire_1.png",
					// "images/fire_2.png",
					// "images/fire_3.png",
					// "images/particles/snow_1.png",
					// "images/particles/snow_2.png",
					// "images/particles/smoke_1.png",
					// "images/particles/smoke_2.png",
					// "images/particles/smoke_3.png",
					// "images/particles/smoke_4.png"
				])
				.load(resolve);
		});
	}

	function getZoomedTileSize() {
		return g.zoom * TILE_SIZE;
	}

	function getEveryone() {
		return g.monsters.concat([g.hero]);
	}

	function getEverything() {
		return getEveryone().concat(g.world.terrain)
	}

	function findMonsterAtPosition(pos) {
		return _.find(g.monsters, (monster) => {
			return monster.pos.equals(pos);
		});
	}

	function findCharacterAtPosition(pos) {
		return _.find(getEveryone(), (one) => {
			return one.pos.equals(pos);
		});
	}

	function moveWorldContainer(delta) {
		g.worldContainer.x -= delta.x;
		g.worldContainer.y -= delta.y;
	}

	function moveWorldContainerTo(coord) {
		g.worldContainer.x = coord.x;
		g.worldContainer.y = coord.y;
	}

	function tick() {

	}

	function advanceRound(round) {
		g.round++;

		g.passableMatrix = getPassableMatrix();

		const everyone = getEveryone();
		_.each(everyone, (one) => {
			// TODO: limit world and people to only those within visible range
			one.lookAtWorld(g.world);
			one.lookAtCharacters(everyone);
			one.think();
		});
		// TODO: Sort everyone by initiative?
		_.each(everyone, (one) => {
			//one.resize(getZoomedTileSize());
			performCharacterAction(one);
		});

		// TODO: Handle multiple characters on one tile due to outdated passableMatrix

		clearDead();

		hideBackgroundTiles();
	}

	function zoomIn() {
		g.zoom += (g.zoom >= 1) ? 1 : 0.2;
		g.zoom = Math.min(g.zoom, 30);
		resizeEveryone();
	}

	function zoomOut() {
		g.zoom -= (g.zoom > 1) ? 1 : 0.2;
		g.zoom = Math.max(g.zoom, 0.2);
		resizeEveryone();
	}

	function resizeEveryone() {
		const everyone = getEveryone();
		_.each(everyone, (one) => { one.resize(getZoomedTileSize()); });
	}

	function planToMoveHeroUp() { return planToMoveHero({x: 0, y: -1}); }
	function planToMoveHeroDown() { return planToMoveHero({x: 0, y: 1}); }
	function planToMoveHeroLeft() { return planToMoveHero({x: -1, y: 0}); }
	function planToMoveHeroRight() { return planToMoveHero({x: 1, y: 0}); }
	function planToMoveHero(tileDelta) {
		const newPos = g.hero.pos.clone().add(tileDelta);
		const monster = findMonsterAtPosition(newPos);
		const verb = (monster) ? "attack" : "move";
		console.log("plan to ", verb);
		g.hero.addNewActionToActionPlan({
			verb: verb,
			pos: newPos
		});
		advanceRound();
	}

	function planToWait() {
		g.hero.addNewActionToActionPlan({
			verb: "wait"
		});
		advanceRound();
	}

	function moveCharacter(char, tileDelta) {
		char.move(tileDelta);
		if (char === g.hero) {
			const zoomedTileSize = getZoomedTileSize();
			moveWorldContainer({
				x: tileDelta.x * zoomedTileSize, 
				y: tileDelta.y * zoomedTileSize
			});
		}
	}

	function isOccupied(pos) {
		return (getPassableMatrixValueByPosition(pos) === 0);
		// let occupied = false;
		// const everyone = getEveryone();
		// _.each(everyone, (one) => {
		// 	if (one.pos.isEqualInteger(pos)) {
		// 		occupied = true;
		// 		return false;
		// 	}
		// });
		// return occupied;
	}

	function performCharacterAction(char) {
		if (char.actionPlan.length <= 0) {
			return false;
		}
		const action = char.actionPlan.pop();
		switch(action.verb) {
			case "move": {
				const tileDelta = char.pos.clone().subtract(action.pos).multiply(-1);
				// TODO: Make the delta always one space?
				if (!isOccupied(action.pos)) {
					moveCharacter(char, tileDelta);
				} else {
					console.log("movement blocked");
				}
			} break;
			case "attack": {
				const targetChar = findCharacterAtPosition(action.pos);
				char.attack(targetChar);
			} break;
			case "wait": {
				char.rest();
			} break;
			default: {
				console.log("default action");
			}
		}
	}

	function clearDead() {
		_.remove(g.monsters, (monster) => {
			const isDead = monster.isDead();
			if (isDead) {
				removeCharacterSpriteFromContainer(monster);
			}
			return isDead;
		});
	}

	function removeCharacterSpriteFromContainer(char) {
		g.containers.npcs.removeChild(char.sprite);
	}

	function getOccupiedMatrix() {
		const occupiedMatrix = {};
		const everyone = getEveryone();
		_.each(everyone, (one) => {
			const locationKey = getPassableMatrixLocationKey(one.pos);
			occupiedMatrix[locationKey] = true;
		});
		return occupiedMatrix;
	}

	function getPassableMatrix() {
		const passableMatrix = {};
		const worldMin = g.world.getMinCoords();
		const worldMax = g.world.getMaxCoords();
		const passableWeights = {
			"W": 0, 
			"P": 4,
			"F": 1,
			"M": 0,
			"D": 1,
			"C": 2
		};
		g.world.loopOverTerrain((terrain, i) => {
			const locationKey = getPassableMatrixLocationKey(terrain.loc);
			passableMatrix[locationKey] = passableWeights[terrain.typeKey];
		}, 1);
		_.each(getEveryone(), (one) => {
			const locationKey = getPassableMatrixLocationKey(one.pos);
			passableMatrix[locationKey] = 0;
		});
		return passableMatrix;
	}

	function getPassableMatrixLocationKey(pos) {
		return pos.x + ',' + pos.y;
	}

	function getPassableMatrixValueByPosition(pos) {
		const locationKey = getPassableMatrixLocationKey(pos);
		return g.passableMatrix[locationKey];
	}

	function hideBackgroundTiles() {
		const occupiedMatrix = getOccupiedMatrix()
		g.world.loopOverTerrain((terrain) => {
			const locationKey = getPassableMatrixLocationKey(terrain.loc);
			const isSomeoneOnTerrain = Boolean(occupiedMatrix[locationKey]);
			terrain.tile.sprite.visible = !isSomeoneOnTerrain;
		});
	}

}).init();