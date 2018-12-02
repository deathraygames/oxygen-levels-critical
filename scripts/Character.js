/** 
 * Originally created as part of LORPRL for 7DRL game jam
 */
(function(RB, astar, Graph){

const { Coords, AStarGraph } = RB;

const DEFAULT_CHAR_SIZE = 16;
const WALKER_AI = 'walker';
const BEAST_AI = 'beast';
const MOVE_GOAL = 'move';
const MOVE_ACTION = 'move';
const ATTACK_ACTION = 'attack';
const WAIT_ACTION = 'wait';
const FACES = ['o_o', 'O_o', '._.', 'o.o', '^_^', '~_~', '>_>', '☉_☉', '¬_¬', '°ロ°', 'ಠ~ಠ', '•◡•', '◉_◉', '°□°', '◔̯◔', ' ͡° ͜ʖ ͡°', 'ツ', '•ᴥ•', 'ಠ_ಠ', '°,,°', '•_•', '■_■', '˚▽˚', 'ಠ⌣ಠ', 'ರ_ರ', 'ʘ‿ʘ', '⚆_⚆', '⍤'];

class Character {
	constructor(options) {
		this.name = options.name || '?';
		this.uniqueId = 'C' + (new Date().getTime()) + Math.round(Math.random() * 999);
		this.isPC = Boolean(options.isPC);
		this.canWander = !this.isPC;
		// Size
		this.size = { x: DEFAULT_CHAR_SIZE, y: DEFAULT_CHAR_SIZE };
		this.blockSize = options.blockSize || { x: DEFAULT_CHAR_SIZE, y: DEFAULT_CHAR_SIZE };
		// Position
		this.pos = Character.getPosFromOptions(options);
		this.lastPos = { x: this.pos.x, y: this.pos.y };
		// Sync character object with sprite / element
		this.sync = options.sync || (() => {});
		// Thinking and actions
		this.actionPlan = [];
		this.goals = [];
		this.actionCooldown = 0;
		this.thinkingCooldown = 0;
		// Stats
		this.ai = {
			type: null,
			canWander: !this.isPC,
			...options.ai,
		};
		this.memory = {
			knownPlaces: options.knownPlaces || [],
		};
		this.speed = options.speed || 32; // per second
		this.damage = [2, 4];
		this.healthMax = options.healthMax || 10;
		this.health = options.health || this.healthMax;
		this.face = getRandomArrayItem(FACES);
	}

	log(...params) {
		console.log(this.name, ...params);
	}

	getGridPos() {
		return {
			x: Math.round(this.pos.x / this.blockSize.x),
			y: Math.round(this.pos.y / this.blockSize.y)
		};
	}
	getPosFromGridPos(gridPos) {
		const { x, y } = gridPos;
		const pos = new Coords(x * this.blockSize.x, y * this.blockSize.y);
		return pos;
	}

	addNewActionToActionPlan(actionOptions) {
		const action = new Action(actionOptions);
		this.addToActionPlan(action);
	}
	addToActionPlan(action) {
		this.actionPlan.push(action);
	}
	clearActionPlan() {
		this.actionPlan.length = 0;
	}
	addNewGoal(goalOptions) {
		const goal = new Goal(goalOptions);
		if (goalOptions.clear) {
			this.clearGoals();
		}
		this.addToGoals(goal);
	}
	addNewMoveGoal(goalOptions) {
		this.addNewGoal({ verb: MOVE_GOAL, ...goalOptions })
	}
	addToGoals(goal) {
		this.goals.push(goal);
	}
	clearGoals() {
		this.goals.length = 0;
	}

	moveAtSpeed(tileDelta, t) {
		const distance = this.speed * (t / 1000);
		// this.log('move at speed', this.speed, 'x t', t, 'Distance', distance);
		this.move(tileDelta.clone().setMagnitude(distance));
	}
	move(tileDelta) {
		this.lastPos = this.pos.clone();
		this.pos.add(tileDelta);
		// this.setSpritePosition();
		this.sync(this);
	}

	attack(targetChar) {
		const dmg = this.getRandomDamage();
		targetChar.hurt(dmg);
		let explanation = this.name + " attacked " + targetChar.name + " for " + dmg + " damage.";
		if (targetChar.isDead()) {
			explanation += " " + targetChar.name + " is dead!";
		}
		console.log(explanation);
		return explanation;
	}
	rest() {
		this.heal(1);
	}
	getRandomDamage() {
		return getRandomIntegerBetween(this.damage[0], this.damage[1]);
	}
	heal(n) {
		this.health += n;
		this.health = Math.min(this.health, this.healthMax);
	}
	hurt(n) {
		this.health -= n;
	}
	isDead() {
		return (this.health <= 0);
	}
	lookAtWorld(visibleWorld) {
		this.visibleWorld = visibleWorld;
	}
	lookAtCharacters(visibleCharacters) {
		this.visibleCharacters = visibleCharacters;
	}
	getNearestCharacter() {
		let nearestDistance = Infinity;
		let nearestCharacter = null;
		_.each(this.visibleCharacters, (character) => {
			if (character === this) {
				return;
			}
			const d = character.pos.getDistance(this.pos);
			if (d < nearestDistance) {
				nearestDistance = d;
				nearestCharacter = character;
			}
		});
		return nearestCharacter;
	}

	cooldown(t) {
		// this.log('cooling down');
		if (this.thinkingCooldown > 0) {
			this.thinkingCooldown -= t;
			if (this.thinkingCooldown < 0) { this.thinkingCooldown = 0; }
		}
		if (this.actionCooldown > 0) {
			this.actionCooldown -= t;
			if (this.actionCooldown < 0) { this.actionCooldown = 0; }
		}
	}

	think(options = {}) {
		if (!this.ai || !this.ai.type || this.thinkingCooldown > 0) {
			return false;
		}
		// this.log('thinking');
		switch (this.ai.type) {
			case WALKER_AI: {
				if (this.goals.length > 0 && this.goals[0].verb === MOVE_GOAL) {
					this.thinkAsWalker(this.goals[0], options.walkingGraph);
					this.thinkingCooldown += 10000;
				}
			} break;
			case BEAST_AI: {
				if (this.goals.length === 0) {
					const nearestCharacter = this.getNearestCharacter();
					// TODO: determine if nearest character is "edible"
					this.targetCharacter(nearestCharacter, "kill");
				}
				const firstGoal = this.goals[0];
				if (firstGoal.verb === "kill") {
					this.planToMoveTowards(firstGoal.target.pos);
				}
				this.thinkingCooldown += 100;
			} break;
		}
		if (this.actionPlan.length === 0 && this.ai.canWander) {
			this.thinkAboutWandering();
			this.thinkingCooldown += 2000 + Math.round(Math.random() * 5000);
		}
	}
	thinkAsWalker(goal, graph) {
		// this.log('thinking as walker to aim to goal', goal);
		// console.log('graph', graph);
		let result = [];
		const aStarGraph = new AStarGraph(graph);
		try {
			const { gridPos } = goal.target;
			const currentGridPos = this.getGridPos();
			result = aStarGraph.search(currentGridPos, gridPos);
		} catch (error) {
			// ignore errors
			console.warn(error, graph, aStarGraph);
		}
		if (!result || result.length === 0) {
			// console.warn('route planning in thinkAsWalker failed');
			// this.log('cannot plan route. Reached goal or blocked.');
			this.clearGoals();
			this.clearActionPlan();
			return;
		}
		this.clearActionPlan();
		this.planToMoveAlongRoute(result);
	}
	thinkAboutWandering() {
		const target = getRandomArrayItem(this.memory.knownPlaces);
		this.addNewMoveGoal({ target, clear: true });
	}
	targetCharacter(character, verb) {
		const goal = new Goal({
			verb: verb,
			noun: "character",
			target: character
		});
		this.addNewGoal(goal);
	}
	planToMoveRandomly() {
		const i = getRandomIntegerBetween(0,3);
		const deltas = [{x: 0, y: 1}, {x: 0, y: -1}, {x: 1, y: 0}, {x: -1, y: 0}];
		const delta = deltas[i];
		this.addNewActionToActionPlan({
			verb: MOVE_ACTION,
			pos: this.pos.clone().add(delta)
		});		
	}
	planToMoveAlongRoute(gridRoute) {
		gridRoute.forEach((gridSpot) => {
			const pos = this.getPosFromGridPos(gridSpot);
			this.addNewActionToActionPlan({
				verb: MOVE_ACTION,
				pos
			});
			// this.log('planToMoveAlongRoute', pos.x, pos.y);
		});
	}

	planToMoveTowards(pos) { // TODO: Remove?
		// this.log('plan to move towards', pos);
		const diff = pos.clone().subtract(this.pos);
		const mag = diff.clone().abs();
		const delta = new RocketBoots.Coords(0, 0);
		if (mag.x > mag.y) {
			delta.x = (diff.x > 0) ? 1 : -1;
		} else {
			delta.y = (diff.y > 0) ? 1 : -1;
		}
		const newPos = this.pos.clone().add(delta);
		//console.log(this.pos, pos, diff, delta, newPos);
		this.addNewActionToActionPlan({
			verb: MOVE_ACTION,
			pos: newPos
		});	
	}

	act(t) {
		// this.log('act...', this.actionPlan.length,  this.actionCooldown);
		if (this.actionPlan.length <= 0 || this.actionCooldown > 0) {
			// this.log('no plans or cooling down');
			return false;
		}
		const action = this.actionPlan[0]; // .pop();
		// this.log('acting 1/', this.actionPlan.length, action.pos.x, action.pos.y);
		switch(action.verb) {
			case MOVE_ACTION: {
				const delta = this.pos.clone().subtract(action.pos).multiply(-1);
				this.moveAtSpeed(delta, t);
				if (this.pos.getDistance(action.pos) < 1) {
					// this.log('success with move', action);
					this.actionPlan.shift();
				}
			} break;
			case ATTACK_ACTION: {
				// const targetChar = findCharacterAtPosition(action.pos);
				// this.attack(targetChar);
			} break;
			case WAIT_ACTION: {
				this.rest();
				this.actionCooldown += 1000;
			} break;
			default: {
				console.log('No action');
			}
		}
		this.actionCooldown += 0;
	}

	static getPosFromOptions(options) {
		if (options.pos instanceof Coords) {
			return options.pos;
		}
		const xy = options.pos || { x: options.x || 0, y: options.y || 0 };
		return new Coords(xy.x, xy.y);
	}
}

class Action {
	constructor(options) {
		this.verb = options.verb;
		this.pos = options.pos;
	}
}

class Goal {
	constructor(options) {
		this.verb = options.verb || null;
		this.noun = options.noun || null;
		this.target = options.target || null;
	}
}

function getRandomIntegerBetween(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomArrayItem(arr) {
	const i = getRandomIntegerBetween(0, arr.length - 1);
	return arr[i];
}


RB.Character = Character;

})(RocketBoots || window, astar, Graph);