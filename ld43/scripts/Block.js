(function(RB){

const BLOCK_SIZE = 16;
const CHARACTER_BLOCK_MAPPING = {
    '': 'space',
    ' ': 'space',
    '#': 'wall',
    '.': 'floor',
    '|': 'cargoDoor',
    '/': 'door',
    'X': 'structure',
    'E': 'exhaust',
    'C': 'container',
    'T': 'terminal',
    'A': 'airlock',
    'L': 'doorLock',
    'O': 'oxygenMonitor',
    's': 'scannerTerminal',
    'g': 'laserTerminal',
};

class Block {
	constructor(char, x, y) {
		this.uniqueId = 'B' + (new Date().getTime()) + Math.round(Math.random() * 99999999);
		this.char = char;
		this.type = Block.getTypeFromChar(char);
		this.passable = Block.getPassableFromType(this.type);
		this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
		this.gridPos = { x, y };
		this.pos = { x: Block.gridToXY(x), y: Block.gridToXY(y) };
		this.isOpen = false;
        this.isLocked = false;
        this.air = Block.getAirFromType(this.type);
        this.connected = [];
	}

	getPassable() {
        // TODO: do some additional logic for open and closed doors
        if (this.isLocked) { return 0; }
		return (this.isOpen) ? 1 : this.passable; 
	}

	toggleOpen() {
		this.isOpen = !this.isOpen;
		return this.isOpen;
	}
	open() {
		if (!this.isLocked) {
			this.isOpen = true;
		}
		return this.isOpen;
	}
	close() {
		if (!this.isLocked) {
			this.isOpen = false;
		}
		return this.isOpen;
    }
    toggleLock() {
        if (this.isLocked) { this.unlock(); } else { this.lock(); }
        return this.isLocked;

    }
	lock() {
		this.isLocked = true;
		this.close();
	}
	unlock() {
		this.isLocked = false;
    }

    connect(block) {
        this.connected.push(block);
        block.connected.push(this);
    }

	// Utility
	static gridToXY(x) {
		return x * BLOCK_SIZE;
	}
	static getTypeFromChar(char) {
		if (typeof char !== 'string') {
			return 'space';
        }
        if (CHARACTER_BLOCK_MAPPING[char]) {
            return CHARACTER_BLOCK_MAPPING[char];
        }
        return 'structure';
	}
	static getPassableFromType(type) {
		if (['space', 'door', 'floor'].includes(type)) {
			return 1;
		}
		return 0;
    }
    static getAirFromType(type) {
        if (['space', 'door', 'floor'].includes(type)) {
            return 1.0;
        }
        return 0.0;
    }
}

RB.Block = Block;

})(RocketBoots || window);