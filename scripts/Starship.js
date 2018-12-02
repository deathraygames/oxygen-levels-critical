(function(RB){

class Starship {
	constructor() {
		this.blockGrid = []; // 2d array of blocks [x][y]
		this.blocks = []; // 1 dimensional array of all blocks
		this.graph = []; // 2d array of grid
		this.gridSize = { x: 32, y: 30 }; // TODO: calculate these
	}
	load() {
		const drawing = [
			' E#############',
			' E##############',
			' E##############',
			'        X    X',
			'        X    X',
			'        X    X        ####',
			'      #####  X          X',
			'######OC..############# X',
			'#..CC#....#...C...#CCC#####',
			'|....##/###.......#...#A..O#',
			'|..CC#....#.......#...#...T#',
			'|....#....###L/##O#L/##....##',
			'|....#................#.....# ',
			'|..../................/....T# ',
			'|....L................#.....# ',
			'|....#....###L/####L/##....##',
			'|....#A...#.......#...#...T#',
			'|....####/#.......#...#CT.O#',
			'#....#C...#CC.....O...#####',
			'#######C..############# X',
			'      #####  X          X',
			'        X    X        ####',
			'        X    X',
			'        X    X',
			' E##############',
			' E##############',
			' E#############',
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
			console.log('check', block, adjacents)
			adjacents.forEach((adjacent) => {
				if (adjacent.type === 'door') {
					block.connect(adjacent);
				}
			});
		});
	}

	getBlock(gridX, gridY) {
		const block = this.blockGrid[gridX][gridY];
		if (!block) {
			console.error('Block not found', gridX, gridY, this.blockGrid);
		}
		return block;
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