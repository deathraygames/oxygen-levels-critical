(function(RB){

const BLOCK_SIZE = 32;

class Starship {
	constructor() {
		this.blockGrid = []; // 2d array of blocks [x][y]
		this.blocks = []; // 1 dimensional array of all blocks
		this.graph = []; // 2d array of grid
		this.gridSize = { x: 32, y: 30 }; // TODO: calculate these
		this.oxygen = 1990; // 5900;
		this.oxygenMax = 2000; // 6000;
		this.isScanning = false;
		this.isMining = false;
	}

	hasHullBreach() {
		let hasCargoDoorOpen = false;
		this.findBlocksByType('cargoDoor').forEach((door) => {
			if (door.isOpen) { hasCargoDoorOpen = true; }
		});
		return hasCargoDoorOpen;
	}

	getFreeflowGraph() {
		// TODO: make graph based on closed doors
		return this.graph;
	}

	getOxygen() {
		return this.oxygen;
	}
	getOxygenRate(characters) {
		const breathingRate = characters.reduce((r, char) => {
			return r + (char.isDead() ? 0 : 1);
		}, 0);
		return (-1 * breathingRate) + 2;
	}
	getOxygenPercent() {
		return (this.getOxygen() / this.oxygenMax) * 100;
	}
	isOutOfOxygen() {
		return (this.oxygen <= 0);
	}

	addOxygen(a) {
		if (typeof a !== 'number' || Number.isNaN(a)) {
			console.warn('addOxygen got a non number as param', a);
			return;
		}
		this.oxygen += a;
		this.oxygen = Math.max(0, Math.min(this.oxygenMax, this.oxygen));
	}

	scan(callback) {
		this.isScanning = true;
		const time = 5000 + Math.round(Math.random() * 30000);
		setTimeout(() => {
			this.isScanning = false;
			callback();
		}, time);
	}

	mine(callback) {
		this.isMining = true;
		const time = 5000 + Math.round(Math.random() * 10000);
		setTimeout(() => {
			const mineAmount = 500 + Math.round(Math.random() * 1500);
			this.addOxygen(mineAmount);
			this.isMining = false;
			callback();
		}, time);
	}

	maintain(t, characters) {
		const rateForTime = this.getOxygenRate(characters) * (t / 1000);
		this.addOxygen(rateForTime);
	}

	load() {
		const drawing = [
			'   E#############',
			'   E##############',
			'   E##############',
			'          X    X',
			'          X    X',
			'          X    X        ####',
			'        #####  X          X',
			'  ######OC..############# X',
			'  #..CC#....#...C...#CCC#####',
			'  |....##/###.......#...#A..O#',
			'  |..CC#....#.......#...#...g#',
			'  |....#....###L/##O#L/##....##',
			'  |....#................#....s# ',
			'  |..../................/....s# ',
			'  |....L................#....s# ',
			'  |....#....###L/####L/##....##',
			'  |....#A...#.......#...#...g#',
			'  |....####/#.......#...#CT.O#',
			'  #....#C...#CC.....O...#####',
			'  #######C..############# X',
			'        #####  X          X',
			'          X    X        ####',
			'          X    X',
			'          X    X',
			'   E##############',
			'   E##############',
			'   E#############',
		];
		this.clearBlocks();
		// Convert drawing to blockGrid
		let y = 0;
		drawing.forEach((line) => {
			console.log(line);
			for (let x = 0; x <= line.length; x++) {
				const char = line.charAt(x).trim();
				const block = (char.length === 0) ? null : new RB.Block(char, x, y);
				this.blockGrid[x][y] = block;
				if (block) {
					this.blocks.push(block);
				}
				// console.log(x, y, char, this.blockGrid[x][y]);
			}
			y++;
		});
		this.setGraph();
		this.setupConnections();
		// console.log(this.blockGrid, this.blocks);
	}

	clearBlocks() {
		this.blocks.length = 0;
		this.blockGrid = Array(this.gridSize.x);
		for(let x = 0; x <= this.gridSize.x; x++) {
			this.blockGrid[x] = Array(this.gridSize.y).fill(null);
		}
	}

	clearGraph() {
		this.graph = Array(this.gridSize.x);
		for(let x = 0; x <= this.gridSize.x; x++) {
			this.graph[x] = Array(this.gridSize.y).fill(0);
		}		
	}

	setGraph() {
		this.clearGraph();
		this.blocks.forEach((block) => {
			this.graph[block.gridPos.x][block.gridPos.y] = block.getPassable();
		});
	}

	setupConnections() {
		this.findBlocksByType('doorLock').forEach((block) => {
			const { x, y } = block.gridPos;
			const adjacents = [
				this.blockGrid[x + 1][y],
				this.blockGrid[x - 1][y],
				this.blockGrid[x][y + 1],
				this.blockGrid[x][y - 1],
			];
			// console.log('check', block, adjacents)
			adjacents.forEach((adjacent) => {
				if (adjacent.type === 'door') {
					block.connect(adjacent);
				}
			});
		});
		this.findBlocksByType('airlock').forEach((block) => {
			this.findBlocksByType('cargoDoor').forEach((door) => {
				block.connect(door);
			});
		});
	}

	getBlock(gridX, gridY) {
		try {
			return this.blockGrid[gridX][gridY];
		} catch (error) {
			return null;
		}
	}

	findRandomBlock(type) {
		const blocks = this.findBlocksByType(type);
		return blocks[Math.floor(Math.random() * blocks.length)];
	}

	findBlocksByType(type) {
		if (!type) { // all types?
			return this.blocks;
		}
		return this.blocks.filter((block) => block.type === type);
	}
}
	

RB.Starship = Starship;

})(RocketBoots || window);