// Battle ships board for use over ham radio
// Jeremy Rifkin 2020
class Board {
	board: HTMLElement;
	grid: HTMLElement[][];
	constructor(element: HTMLElement) {
		this.board = element;
		this.grid = [];
		let trs = this.board.getElementsByTagName("tr");
		for(let i = 2, l = trs.length; i < l; i++) {
			let tds = trs[i].getElementsByTagName("td"),
				cells: HTMLElement[] = [];
			for(let j = 1, ll = tds.length; j < ll; j++) {
				tds[j].setAttribute("data-row", (i - 2).toString());
				tds[j].setAttribute("data-col", (j - 1).toString());
				tds[j].setAttribute("data-grid", "");
				cells.push(tds[j]);
			}
			this.grid.push(cells);
		}
	}
}
class EnemyBoard extends Board {
	constructor(element: HTMLElement) {
		super(element);
		this.initGrid();
	}
	reset() {
		for(let row of this.grid)
			for(let cell of row)
				for(let attr of ["data-active", "data-ship"])
					cell.removeAttribute(attr);
	}
	initGrid() {
		for(let row of this.grid) {
			for(let cell of row) {
				let _cell = cell;
				cell.addEventListener("mousedown", e => {
					if((e.which || e.button) == 1) {
						if(_cell.hasAttribute("data-active")) {
							if(_cell.hasAttribute("data-ship")) {
								_cell.removeAttribute("data-ship");
								_cell.removeAttribute("data-active");
							} else {
								_cell.setAttribute("data-ship", "");
							}
						} else {
							_cell.setAttribute("data-active", "");
						}
					} else if((e.which || e.button) == 3) {
						e.preventDefault();
						_cell.removeAttribute("data-ship");
						_cell.removeAttribute("data-active");
						return false;
					}
				}, false);
				cell.addEventListener("contextmenu", e => {
					e.preventDefault();
				}, false);
			}
		}
	}
}
class PlayerBoard extends Board {
	// TODO: I've used a lot off non-null assertions in this code that are probably seen as bad
	// practice by an experienced TS dev.
	shipsElem: HTMLElement;
	placingShip: number;
	ship: HTMLElement | null;
	ships: HTMLElement[];
	direction_row: boolean;
	lastHover: number[] | null;
	cancelPlace: HTMLElement;
	rotatePlace: HTMLElement;
	constructor(element: HTMLElement) {
		super(element);
		this.shipsElem = document.getElementById("shipsWrapper")!;
		this.placingShip = +false;
		this.ship = null;
		this.ships = [];
		this.direction_row = true;
		this.lastHover = null;
		this.cancelPlace = document.getElementById("cancelPlace")!;
		this.rotatePlace = document.getElementById("rotatePlace")!;
		this.initGrid();
		this.initShips();
	}
	reset() {
		this.placingShip = +false;
		this.ship = null;
		this.direction_row = true;
		this.lastHover = null;
		for(let row of this.grid)
			for(let cell of row)
				for(let attr of ["data-active", "data-highlight", "data-highlight-invalid",
					"data-ship", "data-hull-right", "data-hull-bottom"])
					cell.removeAttribute(attr);
		for(let ship of this.ships)
			ship.removeAttribute("data-placed");
		this.cancelPlace.removeAttribute("data-enabled");
		this.rotatePlace.removeAttribute("data-enabled");
	}
	initGrid() {
		for(let row of this.grid) {
			for(let cell of row) {
				let _cell = cell;
				cell.addEventListener("mousedown", e => {
					if((e.which || e.button) != 1)
						return;
					if(this.placingShip) {
						let r = parseInt((e.target as HTMLElement).getAttribute("data-row")!),
							c = parseInt((e.target as HTMLElement).getAttribute("data-col")!);
						if(this.placeShip(r, c)) {
							(this.ship as HTMLElement).setAttribute("data-placed", "");
							this.endShipPlacement();
						}
					} else {
						if(_cell.hasAttribute("data-active"))
							_cell.removeAttribute("data-active");
						else
							_cell.setAttribute("data-active", "");
					}
				}, false);
				cell.addEventListener("mouseover", e => {
					if(this.placingShip) {
						this.clearHighlight();
						// highlight
						let r = parseInt((e.target as HTMLElement).getAttribute("data-row")!),
							c = parseInt((e.target as HTMLElement).getAttribute("data-col")!);
						this.lastHover = [r, c];
						this.doHighlight(r, c);
					}
				}, false);
				cell.addEventListener("mouseout", e => {
					if(this.placingShip && (e.relatedTarget == null ||
						!(e.relatedTarget as HTMLElement).hasAttribute("data-grid")))
						this.clearHighlight();
				}, false);
			}
		}
	}
	initShips() {
		for(let d of [6, 4, 2, 4, 2, 3, 2, 3, 2, 3]) {
			let ship = document.createElement("div");
			ship.setAttribute("class", "ship");
			for(let i = 0; i < d; i++) {
				let hull = document.createElement("div");
				hull.setAttribute("class", "hull");
				ship.appendChild(hull);
			}
			let shipclass = d;
			ship.addEventListener("mousedown", () => {
				if(!ship.hasAttribute("data-placed")) {
					this.ship = ship;
					this.placingShip = shipclass;
					this.cancelPlace.setAttribute("data-enabled", "");
					this.rotatePlace.setAttribute("data-enabled", "");
				}
			}, false);
			this.ships.push(ship);
			this.shipsElem.appendChild(ship);
		}
		this.cancelPlace.addEventListener("mousedown", () => {
			this.placingShip = +false;
			this.endShipPlacement();
			this.clearHighlight();
		}, false);
		this.rotatePlace.addEventListener("mousedown", () => {
			this.direction_row = !this.direction_row;
		}, false);
		window.addEventListener("keypress", e => {
			if(this.placingShip) {
				if(e.key == "r" || e.key == "R")
					this.direction_row = !this.direction_row;
				if(this.lastHover != null) {
					let _lastHover = this.lastHover;
					this.clearHighlight();
					this.doHighlight(_lastHover[0], _lastHover[1]);
					this.lastHover = _lastHover;
				}
			}
		}, false);
	}
	endShipPlacement() {
		this.placingShip = +false;
		this.ship = null;
		this.clearHighlight();
		this.cancelPlace.removeAttribute("data-enabled");
		this.rotatePlace.removeAttribute("data-enabled");
		this.direction_row = true;
	}
	clearHighlight() {
		// clear grid
		for(let r of this.grid) {
			for(let c of r) {
				c.removeAttribute("data-highlight");
				c.removeAttribute("data-highlight-invalid");
			}
		}
		this.lastHover = null;
	}
	doHighlight(r: number, c: number) {
		if(this.direction_row) {
			c -= Math.ceil(this.placingShip / 2) - 1;
			if(c <= 0)
				c = 0;
			if(c + this.placingShip >= this.grid[r].length)
				c = this.grid[r].length - this.placingShip;
			let valid = true;
			for(let _c = 0; _c < this.placingShip; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				if(this.grid[r][c + _c].hasAttribute("data-ship"))
					valid = false;
			}
			for(let _c = 0; _c < this.placingShip; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				this.grid[r][c + _c].setAttribute(valid ? "data-highlight" : "data-highlight-invalid", "");
			}
		} else {
			r -= Math.ceil(this.placingShip / 2) - 1;
			if(r <= 0)
				r = 0;
			if(r + this.placingShip >= this.grid.length)
				r = this.grid.length - this.placingShip;
			let valid = true;
			for(let _r = 0; _r < this.placingShip; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				if(this.grid[r + _r][c].hasAttribute("data-ship"))
					valid = false;
			}
			for(let _r = 0; _r < this.placingShip; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				this.grid[r + _r][c].setAttribute(valid ? "data-highlight" : "data-highlight-invalid", "");
			}
		}
	}
	placeShip(r: number, c: number) {
		if(this.direction_row) {
			c -= Math.ceil(this.placingShip / 2) - 1;
			if(c <= 0)
				c = 0;
			if(c + this.placingShip >= this.grid[r].length)
				c = this.grid[r].length - this.placingShip;
			let valid = true;
			for(let _c = 0; _c < this.placingShip; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				if(this.grid[r][c + _c].hasAttribute("data-ship"))
					valid = false;
			}
			if(!valid)
				return false;
			for(let _c = 0; _c < this.placingShip; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				this.grid[r][c + _c].setAttribute("data-ship", "");
				if(_c != this.placingShip - 1)
					this.grid[r][c + _c].setAttribute("data-hull-right", "");
			}
		} else {
			r -= Math.ceil(this.placingShip / 2) - 1;
			if(r <= 0)
				r = 0;
			if(r + this.placingShip >= this.grid.length)
				r = this.grid.length - this.placingShip;
			let valid = true;
			for(let _r = 0; _r < this.placingShip; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				if(this.grid[r + _r][c].hasAttribute("data-ship"))
					valid = false;
			}
			if(!valid)
				return false;
			for(let _r = 0; _r < this.placingShip; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				this.grid[r + _r][c].setAttribute("data-ship", "");
				if(_r != this.placingShip - 1)
					this.grid[r + _r][c].setAttribute("data-hull-bottom", "");
			}
		}
		return true;
	}
}

let you = new PlayerBoard(document.getElementById("player")!),
	enemy = new EnemyBoard(document.getElementById("enemy")!);

document.getElementById("reset")!.addEventListener("click", () => {
	you.reset();
	enemy.reset();
}, false);
