(function(RB){

class StarshipDOM {
    constructor(document, id) {
        this.element = document.getElementById(id);
        // this.setupEvents();
        this.zoomAmount = 3;
    }

    setupEvents(blockCallback, characterCallback) {
        this.element.addEventListener('click', (event) => {
            const clickedElt = event.target;
            // console.log('clicked!', clickedElt.tagName);
            if (clickedElt.tagName === 'DIV') {
                const { classList } = clickedElt;
                if (classList.contains('character')) {
                    if (classList.contains('pc')) {
                        return; // do nothing if clicking on self
                    }
                    characterCallback(clickedElt, clickedElt.getAttribute('id'));
                    return;
                }
                if (classList.contains('block')) {
                    blockCallback(clickedElt, clickedElt.getAttribute('data-gridx'), clickedElt.getAttribute('data-gridy'));
                    return;
                }
            }
            console.log('clicked something else');
        });
        window.addEventListener('wheel', (event) => {
            this.zoom(event.wheelDelta);
        });
    }

    render(ship, characters) {
        this.element.innerHTML = StarshipDOM.getBlocksHtml(ship.blocks) + StarshipDOM.getCharactersHtml(characters);
    }

    updateCharacter(char) {
        const elt = document.getElementById(char.uniqueId); // TODO: use a lookup map of elements if this becomes a bottleneck
        elt.style.top = char.pos.y + 'px';
        elt.style.left = char.pos.x + 'px';
        if (char.isHurt()) {
            elt.classList.add('hurt');
        } else {
            elt.classList.remove('hurt');
        }
        if (char.isDead()) {
            elt.innerHTML = char.deadFace;
            elt.classList.add('dead');
        } else {
            elt.classList.remove('dead');
            if (char.isHurt()) {
                elt.classList.add('hurt');
            } else {
                elt.classList.remove('hurt');
            }
        }
    }

    updateOxygenMonitors(ship, characters, rate, percent) {
        rate = rate || ship.getOxygenRate(characters);
		percent = percent || Math.ceil(ship.getOxygenPercent());
        const monitors = ship.findBlocksByType('oxygenMonitor');
        monitors.forEach((block) => {
            const elt = document.getElementById(block.uniqueId);
            elt.innerHTML = Math.round(percent) + '%<br />' + rate;
        });
    }

    center(what) {
        const eltCenter = StarshipDOM.getElementCenter(what.uniqueId);
        const shipRect = this.element.getBoundingClientRect();
        const mid = StarshipDOM.getWindowCenter();
        const offset = {
            x: Math.round(mid.x - eltCenter.x),
            y: Math.round(mid.y - eltCenter.y)
        };
        const left = Math.round(shipRect.x + offset.x);
        const top =  Math.round(shipRect.y + offset.y);
        this.element.style.left = left + 'px';
        this.element.style.top = top + 'px';
        // console.log(eltCenter, shipRect, mid, '\noffset', offset, left, top);
    }

    static getElementCenter(id) {
        const elt = document.getElementById(id);
        const eltRect = elt.getBoundingClientRect();
        return {
            x: eltRect.x + (eltRect.width/2),
            y: eltRect.y + (eltRect.height/2)
        };
    }

    static getWindowCenter() {
        return { x: window.innerWidth/2, y: window.innerHeight/2 };
    }

    zoom(delta) {
        const direction = Math.sign(delta);
        this.zoomAmount += (direction * 0.1);
        this.zoomAmount = Math.min(10, Math.max(0.1, this.zoomAmount));
        this.element.style.transform = `scale(${this.zoomAmount}) rotate3d(1,0.1,0,20deg)`;
    }

    // Open/Close
    static open(element, force) {
        if (typeof force === undefined || force === true) {
            element.classList.add('open');
        } else {
            StarshipDOM.close(element);
        }
    }
    static close(element) {
        element.classList.remove('open');
    }
    static openById(id, force) {
        const elt = document.getElementById(id);
        return StarshipDOM.open(elt, force);        
    }
    // Lock/Unlock
    static lock(element, force) {
        if (typeof force === undefined || force === true) {
            element.classList.add('locked');
        } else {
            StarshipDOM.unlock(element);
        }
    }
    static unlock(element) {
        element.classList.remove('locked');
    }
    static lockById(id, force) {
        const elt = document.getElementById(id);
        return StarshipDOM.lock(elt, force);
    }

	static getBlocksHtml(blocks) {
        return blocks.reduce((html, block) => html + StarshipDOM.getBlockHtml(block), '');
    }
    
    static getBlockHtml(block) {
        const openClass = (block.isOpen) ? 'open' : '';
        const lockedClass = (block.isLocked) ? 'locked' : '';
        return `<div style="top: ${block.pos.y}px; left: ${block.pos.x}px; width: ${block.size.x}px; height: ${block.size.y}px;"
            id="${block.uniqueId}"
            class="block type-${block.type} ${openClass} ${lockedClass}"
            data-x="${block.pos.x}" data-y="${block.pos.y}"
            data-gridx="${block.gridPos.x}" data-gridy="${block.gridPos.y}"
            title="${block.type}"> 
        </div>`; //  (${block.gridPos.x}, ${block.gridPos.y})">
    }

    static getCharactersHtml(characters) {
        return characters.reduce((html, character) => html + StarshipDOM.getCharacterHtml(character), '');
    }

    static getCharacterHtml(char) {
        const pcClass = (char.isPC) ? 'pc' : '';
        return `<div style="top: ${char.pos.y}px; left: ${char.pos.x}px; width: ${char.size.x}px; height: ${char.size.y}px;"
            id="${char.uniqueId}"
            class="character ${pcClass}"
            data-x="${char.pos.x}" data-y="${char.pos.y}"
            title="${char.name}">
            ${char.face}
        </div>`;
    }
}

RB.StarshipDOM = StarshipDOM;


})(RocketBoots || window);