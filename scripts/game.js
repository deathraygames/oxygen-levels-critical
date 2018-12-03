(function(RB){

const { Coords } = RB;
const synth = window.speechSynthesis; // TODO: abstract this into another module
synth.cancel(); // cancel previous speech

const BLOCK_SIZE = 16;
const CRITICAL_PERCENT = 30;
const CONVINCE_CHANCE = 0.3;
let tick = 0;
let loopFrame;
let lastTime;
let lastOxygenPercent = Infinity;
let showedWin = false;
let asteroids = 0;
const STAR_FIELD_SIZES = [3000, 3000];
const starFields = [STAR_FIELD_SIZES[0], STAR_FIELD_SIZES[1]];
const spaceElement = document.getElementById('space');
const pageElement = document.getElementById('page');
const notificationsElement = document.getElementById('notifications');
const ship = new RB.Starship();
ship.load();
const characters = makeCharacters(ship);
const pc = makePlayerCharacter();
characters.push(pc);
const starshipDOM = new RB.StarshipDOM(document, 'ship');
starshipDOM.setupEvents(interactWithBlock, interactWithCharacter);
starshipDOM.render(ship, characters);

synth.onvoiceschanged = () => {
	giveVoices();
	
};

const creditsDialog = document.getElementById('credits');
const introDialog = document.getElementById('intro');
introDialog.style.display = 'block';
document.getElementById('beginButton').addEventListener('click', (event) => {
	introDialog.style.display = 'none';
	speakIntro();
	main();
});

document.getElementById('reload-button').addEventListener('click', () => {
	stopLoop();
	location.reload();
});
document.getElementById('continue-button2').addEventListener('click', continueGame);
document.getElementById('continue-button').addEventListener('click', continueGame);
document.getElementById('open-intro').addEventListener('click', () => {
	stopLoop();
	introDialog.style.display = 'block';
});
document.getElementById('open-credits').addEventListener('click', () => {
	stopLoop();
	creditsDialog.style.display = 'block';
	introDialog.style.display = 'none';
});

//----- Functions, hoisted

function continueGame() {
	pageElement.classList.remove('game-win');
	creditsDialog.style.display = 'none';
	main();
}

function makeCharacters(ship) {
	const arr = [];
	for(let i = 0; i < 12; i++) {
		arr.push(makeNPC((i + 1), ship));
	}
	return arr;
}

function makeNPC(n, ship) {
	const block = ship.findRandomBlock('floor');
	const { x, y } = block.pos;
	const npc = new RB.Character({
		name: 'Crew member ' + n,
		pos: { x, y },
		ai: { type: 'walker' },
		healthMax: 100,
		sync: (char) => starshipDOM.updateCharacter(char),
		knownPlaces: ship.findBlocksByType('floor'),
		speed: 20 + Math.round(Math.random() * 20),
	});
	npc.thinkingCooldown = Math.round(Math.random() * 5000);
	return npc;
}

function makePlayerCharacter() {
	return new RB.Character({
		name: 'Survivor',
		pos: { x: 27 * BLOCK_SIZE, y: 13 * BLOCK_SIZE },
		ai: { type: 'walker' },
		healthMax: 100,
		isPC: true,
		sync: (char) => starshipDOM.updateCharacter(char),
		knownPlaces: ship.findBlocksByType('floor'),
		speed: 64, // 32,
	});
}

function giveVoices() {
	const voices = synth.getVoices();
	characters.forEach((char) => {
		char.voice = getRandomArrayItem(voices);
		char.voiceRate = getRandomArrayItem([0.5, 1, 1, 1, 1.5, 1.75]);
		char.voicePitch = getRandomArrayItem([0.1, 0.4, 0.5, 0.6, 0.7, 0.8, 1, 1, 1, 1.5, 2]);
	});
}

function interactWithBlock(element, gridX, gridY) {
	const block = ship.getBlock(gridX, gridY);
	if (block.type === 'door') {
		console.log('OPEN', block);
		// TODO: Make sure block is in interaction range
		const opened = block.toggleOpen();
		RB.StarshipDOM.open(element, opened);
	} else if (block.type === 'floor') {
		pc.clearGoals();
		pc.clearActionPlan();
		pc.thinkingCooldown = 0;
		pc.addNewMoveGoal({ target: block, clear: true });
		pc.think({ walkingGraph: ship.graph	});
		// console.log('Move to floor', block, pc);
	} else if (block.type === 'doorLock') {
		// console.log('LOCK', block);
		if (block.connected.length > 0) {
			const locked = block.connected[0].toggleLock(); // TODO: improve
			RB.StarshipDOM.lockById(block.connected[0].uniqueId, locked);
			computerSpeak((locked) ? 'Door locked.' : 'Door unlocked.');
		}
	} else if (block.type === 'airlock') {
		// console.log('AIRLOCK', block);
		const opening = !block.connected[0].isOpen;
		const fnName = (opening) ? 'open' : 'close';
		computerSpeak((opening) ? 'Warning: Opening cargo doors' : 'Closing cargo doors');
		block.connected.forEach((connectedBlock) => {
			connectedBlock[fnName]();
			RB.StarshipDOM.openById(connectedBlock.uniqueId, opening);
		});
	} else if (block.type === 'oxygenMonitor') {
		const oxygen = Math.round(ship.getOxygen());
		const oxygenRate = ship.getOxygenRate(characters);
		const percent = Math.ceil(ship.getOxygenPercent());
		const intro = (percent <= CRITICAL_PERCENT) ? 'Oxygen levels critical!' : '';
		computerSpeak(`${intro} The oxygen supply is at ${oxygen} units, and the rate is ${oxygenRate}.`);
		starshipDOM.updateOxygenMonitors(ship, characters, oxygenRate, percent);
	} else if (block.type === 'scannerTerminal') {
		activateScanners();
	} else if (block.type === 'laserTerminal') {
		activateLasers();
	} else if (block.type === 'container') {
		activateContainer();
	} else if (block.type === 'terminal') {
		activateTerminal();
	} else {
		console.log('block', block);	
	}
	ship.setGraph();
}

function activateScanners() {
	if (ship.isScanning) {
		computerSpeak('Waiting for scan to complete.');
		return;
	}
	computerSpeak('Scanning for asteroids.');
	ship.scan(() => {
		computerSpeak('Asteroid found.');
		asteroids += 1;
	});
}

function activateLasers() {
	if (ship.isMining) {
		computerSpeak('Waiting for mining to complete.');
		return;
	}
	if (asteroids <= 0) {
		computerSpeak('There are no nearby asteroids.');
		return;
	}
	asteroids -= 1;
	computerSpeak('Mining asteroid for ice.');
	ship.mine(() => {
		computerSpeak('Mining complete. Ice was turned into oxygen.');
	});
}

function activateContainer() {
	const number = Math.ceil(Math.random() * 20);
	const stuff = [
		"Just old socks.",
		"You find some Orion glamour magazines.",
		"Bubble gum sticks to your hand",
		"Thankfully you find a towel!",
		"A cat named Frankenstein jumps from the container and hides.",
		"You find dirty gears.",
		"You find a laser torch but without a battery.",
		"What is this junk?",
		"More junk...",
		"You pull out a cardboard box with 'Transmogrifier' written on it.",
		`You find ${number} toothbrushes`,
		`${number} batteries`,
		`${number} gold coins ... What good are those?`,
		`You find a deathray gun.`,
		`You find ${number} robot parts.`,
		`${number} widgets`,
		`crew member's uniform`,
		`You find an old severed hand with a tag: "please return to D.V."`,
		`You find a tasty candybar!`,
		`${number} breath mints`,
		`some alien goo`,
	];
	notify(getRandomArrayItem(stuff));
}

function activateTerminal() {
	const programs = [
		"You boot up DOS...",
		"[Blue screen of death]",
		"SETI@home begins returning signs of life.",
		"You play Ultima VII and accidentally cast VAS KAL AN MANI IN CORP HUR TYM.",
		"You build a rocket in Kerbal Space Program, but realize you're in a rocket already.",
		"You confuse a game of Space Engineers with real life on this ship.",
		"You post on a forum about how terrible this game is for not having multiplayer.",
		"You write about your love for this game on Reddit.",
		"You send out a tweet about the fate of the ship. Sad!",
		"You play some video games...",
		"You browse the galactic web...",
		"You play LORD and flirt with Violet.",
		"You open up the console and type: ship.oxygen += 100;"
	];
	notify(getRandomArrayItem(programs));
}

function interactWithCharacter(element, uniqueId) {
	const character = characters.find((char) => char.uniqueId === uniqueId);
	const goToCargo = (Math.random() < CONVINCE_CHANCE);
	let text = getRandomTalkText(goToCargo);
	if (goToCargo) {
		const y = getRandomArrayItem([11, 12, 13, 14, 15]);
		const target = ship.getBlock(4, y);
		character.addNewMoveGoal({ target, clear: true });
		character.cooldown(Infinity);
		// character.thinkingCooldown += 10000;
		notify(`You convinced ${character.name} to go to the cargo hold.`);
	}
	speak(text, character.voice, character.voicePitch, character.voiceRate);
	
}

function computerSpeak(text) {
	synth.cancel();
	speak(text, 0, 0.3, 1.5);
	notify(text);
}

function notify(text) {
	notificationsElement.innerHTML = text;
}

function speak(text, voice, pitch = 1, rate = 1) {
	// Based on example from https://mdn.github.io/web-speech-api/speak-easy-synthesis/
	const utterance = new SpeechSynthesisUtterance(text);
	if (typeof voice === 'number') {
		const voices = synth.getVoices();
		voice = voices[voice];
	}
	utterance.voice = voice;
	utterance.pitch = pitch;
	utterance.rate = rate;
	utterance.onpause = function(event) {
	  const char = event.utterance.text.charAt(event.charIndex);
	  console.log('Speech paused at character ' + event.charIndex + ' of "' +
	  event.utterance.text + '", which is "' + char + '".');
	};
	synth.speak(utterance);
}

function speakIntro() {
	// return; // REMOVE
	computerSpeak(`
		Greeting space traveler!
		Welcome to the starship. Please make yourself at home.
	`);
}

function getRandomTalkText(goingToCargo) {
	const babble = [
		"Hello!", "Hi!", "Is the air getting thin?", "I hope I survive this trip.",
		"Space is scary.", "Space travel is exciting!", "This starship is the best I've been on",
		"Wandering is my favorite activity", "Who's flying this thing?",
		"I wonder what's in these containers", "I don't want to be a sacrifice",
		"I can't figure out these door locks. Can you?", "I'm afraid I can't do that.",
		"Time is an illusion", "Live long and prosper", "Life is short",
		"We're boldly going where no one has gone before", "The stars are beautiful",
		"Hello", "Hello", "Hey", "Hey bro", "Hi", "Hi", "What do you want?", "What's up?",
		"I'll be mad if I end up in the cold of space", "I'm bored",
		"I clicked on the terminals but nothing happened."
	];
	const cargoComments = [
		"I should go check out the cargo hold.",
		"Heading to the cargo hold.",
		"As you wish",
		"You're right, the cargo hold is the best room on the ship.",
		"I think I left something in the cargo hold.",
		"Sure, I'll go to the back of the ship. No harm in it, right?",
	];
	return getRandomArrayItem(goingToCargo ? cargoComments : babble);
}

function getRandomIntegerBetween(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomArrayItem(arr) {
	const i = getRandomIntegerBetween(0, arr.length - 1);
	return arr[i];
}

function moveStars(t) {
	starFields[0] -= 3;
	starFields[1] -= 0.5;
	starFields.forEach((field, i) => {
		if (field < 0) {
			starFields[i] = field + STAR_FIELD_SIZES[i];
		}
	});
	spaceElement.style.backgroundPosition = `${starFields[0]}px 0, ${starFields[1]}px 0`;
}

function handleHullBreach(t, tick) {
	const cargoDoors = ship.findBlocksByType('cargoDoor');
	const targetCargoDoor = getRandomArrayItem(cargoDoors);
	const flingOffset = 100 * BLOCK_SIZE;
	const spacePos = new Coords(targetCargoDoor.pos.x - flingOffset, targetCargoDoor.pos.y);
	characters.forEach((char) => {
		const route = char.getRoute(targetCargoDoor.gridPos, ship.getFreeflowGraph());
		if (route.length > 0) {
			char.moveTowardsAtSpeed(spacePos, t, 100);
		}
		const { x, y } = char.getGridPos();
		const block = ship.getBlock(x, y);
		if (!block) { // character is out in space
			char.hurt(1);
			starshipDOM.updateCharacter(char);
		}
	});
}

function characterLoopActions(char, t, outOfOxygen) {
	if (outOfOxygen) {
		if (Math.random() < 0.2) {
			char.hurt(1);
		}
	}
	char.think({ walkingGraph: ship.graph });
	char.act(t);
	char.cooldown(t);	
}

function oxygenAlert(oxygenPercent) {
	let text = `Oxygen levels at ${oxygenPercent} percent.`;
	if (oxygenPercent <= CRITICAL_PERCENT) {
		text = `Oxygen levels critical at ${oxygenPercent} percent.`;
	}
	if (oxygenPercent === 0) {
		text = `Oxygen depleted. It was nice knowing you.`;
	} else if (oxygenPercent === 60) {
		text += `<silence msec="1000" /> I don't mean to alarm you but our oxygen capacity is insufficient for the current crew.`;
	} else if (oxygenPercent === 40) {
		text += `<silence msec="1000" /> At the current rate of oxygen consumption, if nothing is done we will suffer a catastrophic loss of life.`
	} else if (oxygenPercent === 20) {
		text += `<silence msec="1000" /> Extra oxygen consumers may need to be jettisoned. Unfortunately sacrifices must be made.`;
	}
	computerSpeak(text);
}

function autoOpenDoors() {
	ship.findBlocksByType('door').forEach((door) => {
		const nearby = characters.reduce((n, char) => {
			const dist = char.pos.getDistance(door.pos);
			return n + ((dist < 2 * BLOCK_SIZE) ? 1 : 0);
		}, 0);
		const opening = (nearby > 0);
		if (opening) { door.open(); } else { door.close(); }
		RB.StarshipDOM.openById(door.uniqueId, opening);
	});
}

function main(tFrame) {
	// See: https://developer.mozilla.org/en-US/docs/Games/Anatomy
	loopFrame = window.requestAnimationFrame(main);
	tFrame = tFrame || 0;
	lastTime = lastTime || 0;
	const elapsedTime = (lastTime) ? tFrame - lastTime : 0;
	lastTime = tFrame;
	tick++;
	// let t = window.performance.now();
	// console.log(tFrame, t);
	// if (tick % 100 === 0) { console.log('tick', tick, tFrame); }
	// let d = (tick % 100 >= 50) ? 1 : -1;
	// pc.move({ x: d, y: 0 });

	if (typeof elapsedTime !== 'number' || Number.isNaN(elapsedTime)) {
		console.warn('elapsedTime is not a number', tFrame, lastTime);
	}

	if (tick % 10 === 0) {
		starshipDOM.center(pc);
		starshipDOM.updateOxygenMonitors(ship, characters);
		autoOpenDoors();
	}
	const oxygenRate = ship.getOxygenRate(characters);
	const oxygenPercent = Math.ceil(ship.getOxygenPercent());
	const outOfOxygen = ship.isOutOfOxygen();

	if (oxygenPercent !== lastOxygenPercent && oxygenPercent % 10 === 0) {
		oxygenAlert(oxygenPercent);
	}

	characters.forEach((char) => characterLoopActions(char, elapsedTime, outOfOxygen));

	ship.maintain(elapsedTime, characters);
	
	if (ship.hasHullBreach()) {
		handleHullBreach(elapsedTime, tick);
	}
	if (pc.isDead()) {
		pageElement.classList.add('game-over');
	} else if (oxygenRate >= 0 && !showedWin) {
		stopLoop();
		pageElement.classList.add('game-win');
		showedWin = true;
	}
	moveStars(elapsedTime);

	lastOxygenPercent = oxygenPercent;
}

function stopLoop() {
	window.cancelAnimationFrame(loopFrame);
}



// expose things for testing
window.ship = ship;
window.characters = characters;
window.game = {
	stopLoop: stopLoop,
	synth: synth
};

})(RocketBoots);