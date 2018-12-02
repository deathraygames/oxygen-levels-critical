(function(RB){

const BLOCK_SIZE = 16;

class Block {
	constructor(char, x, y) {
		this.uniqueId = 'B' + (new Date().getTime()) + Math.round(Math.random() * 999);
		this.char = char;
		this.type = Block.getTypeFromChar(char);
		this.passable = Block.getPassableFromType(this.type);
		this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
		this.gridPos = { x, y };
		this.pos = { x: Block.gridToXY(x), y: Block.gridToXY(y) };
		this.isOpen = false;
        this.isLocked = false;
        this.air = Block.getAirFromType(this.type);
        this.connected = null;
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
        this.connected = block;
        block.connected = this;
    }

	// Utility
	static gridToXY(x) {
		return x * BLOCK_SIZE;
	}
	static getTypeFromChar(char) {
		if (typeof char !== 'string') {
			return 'space';
		}
		switch(char) {
			case '':
			case ' ':
				return 'space';
				break;
			case '#':
				return 'wall';
				break;
			case '.':
				return 'floor';
				break;
			case '|':
				return 'cargoDoor';
				break;
			case '/':
				return 'door';
				break;
			case 'X':
				return 'structure';
				break;
			case 'E':
                return 'exhaust';
                break;
            case 'C':
                return 'container';
                break;
            case 'T':
                return 'terminal';
                break;
            case 'A':
                return 'airlock';
                break;
            case 'L':
                return 'doorLock';
                break;
            case 'O':
                return 'oxygenMonitor';
                break;
		}
		return 'wall';
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