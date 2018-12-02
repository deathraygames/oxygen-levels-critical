(function(RB){

let tick = 0;
let loopFrame;
let lastTime;
const ship = new RB.Starship();
ship.load();
const characters = makeCharacters(ship);
const pc = makePlayerCharacter();
characters.push(pc);
const starshipDOM = new RB.StarshipDOM(document, 'ship');
starshipDOM.setupEvents(interactWithBlock, interactWithCharacter);
starshipDOM.render(ship, characters);

main();

//----- Functions, hoisted

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
		ai: { type: 'walker' },
		pos: { x, y },
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
		pos: { x: 9 * 16, y: 11 * 16 },
		ai: { type: 'walker' },
		isPC: true,
		sync: (char) => starshipDOM.updateCharacter(char),
		knownPlaces: ship.findBlocksByType('floor'),
		speed: 32,
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
		console.log('Move to floor', block, pc);
	} else if (block.type === 'doorLock') {
		console.log('LOCK', block);
		if (block.connected) {
			const locked = block.connected.toggleLock();
			RB.StarshipDOM.lockById(block.connected.uniqueId, locked);
		}
	}
	ship.setGraph();
	console.log('block', block);
}

function interactWithCharacter(element, name) {
	console.log('character', name);
}

function main(tFrame) {
	// See: https://developer.mozilla.org/en-US/docs/Games/Anatomy
	loopFrame = window.requestAnimationFrame(main);
	const elapsedTime = (lastTime) ? tFrame - lastTime : 0;
	lastTime = tFrame;
	tick++;
	// let t = window.performance.now();
	// console.log(tFrame, t);
	// if (tick % 100 === 0) { console.log('tick', tick, tFrame); }
	// let d = (tick % 100 >= 50) ? 1 : -1;
	// pc.move({ x: d, y: 0 });

	if (tick % 10 === 0) {
		starshipDOM.center(pc);	
	}
	characters.forEach((char) => {
		char.think({ walkingGraph: ship.graph });
		char.act(elapsedTime);
		char.cooldown(elapsedTime);
	});
}

function stopLoop() {
	window.cancelAnimationFrame(loopFrame);
}



// expose things for testing
window.ship = ship;
window.characters = characters;
window.game = {
	stopLoop: stopLoop
};

})(RocketBoots);