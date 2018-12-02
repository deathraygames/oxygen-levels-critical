(function(RB){

class StarshipDOM {
    constructor(document, id) {
        this.element = document.getElementById(id);
        // this.setupEvents();
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
                    characterCallback(clickedElt, clickedElt.getAttribute('title'));
                    return;
                }
                if (classList.contains('block')) {
                    blockCallback(clickedElt, clickedElt.getAttribute('data-gridx'), clickedElt.getAttribute('data-gridy'));
                    return;
                }
            }
            console.log('clicked something else');
        });
    }

    render(ship, characters) {
        this.element.innerHTML = StarshipDOM.getBlocksHtml(ship.blocks) + StarshipDOM.getCharactersHtml(characters);
    }

    updateCharacter(char) {
        const elt = document.getElementById(char.uniqueId); // TODO: use a lookup map of elements if this becomes a bottleneck
        elt.style.top = char.pos.y + 'px';
        elt.style.left = char.pos.x + 'px';
    }

    center(what) {
        const elt = document.getElementById(what.uniqueId);
        const eltRect = elt.getBoundingClientRect();
        const shipRect = this.element.getBoundingClientRect();
        const mid = { x: window.innerHeight/2, y: window.innerWidth/2 };
        const offset = { x: mid.x - eltRect.x, y: mid.y - eltRect.y };
        this.element.style.left = Math.round(shipRect.x + offset.x) + 'px';
        this.element.style.top = Math.round(shipRect.y + offset.y) + 'px';
    }

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