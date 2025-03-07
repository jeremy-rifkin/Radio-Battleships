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
	ships_elem: HTMLElement;
	placing_ship: number;
	ship: HTMLElement | null;
	ships: HTMLElement[];
	direction_row: boolean;
	last_hover: number[] | null;
	cancel_place: HTMLElement;
	rotate_place: HTMLElement;
	constructor(element: HTMLElement) {
		super(element);
		this.ships_elem = document.getElementById("shipsWrapper")!;
		this.placing_ship = +false;
		this.ship = null;
		this.ships = [];
		this.direction_row = true;
		this.last_hover = null;
		this.cancel_place = document.getElementById("cancelPlace")!;
		this.rotate_place = document.getElementById("rotatePlace")!;
		this.initGrid();
		this.initShips();
	}
	reset() {
		this.placing_ship = +false;
		this.ship = null;
		this.direction_row = true;
		this.last_hover = null;
		for(let row of this.grid)
			for(let cell of row)
				for(let attr of ["data-active", "data-highlight", "data-highlight-invalid",
					"data-ship", "data-hull-right", "data-hull-bottom"])
					cell.removeAttribute(attr);
		for(let ship of this.ships)
			ship.removeAttribute("data-placed");
		this.cancel_place.removeAttribute("data-enabled");
		this.rotate_place.removeAttribute("data-enabled");
	}
	initGrid() {
		for(let row of this.grid) {
			for(let cell of row) {
				let _cell = cell;
				cell.addEventListener("mousedown", e => {
					if((e.which || e.button) != 1)
						return;
					if(this.placing_ship) {
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
					if(this.placing_ship) {
						this.clearHighlight();
						// highlight
						let r = parseInt((e.target as HTMLElement).getAttribute("data-row")!),
							c = parseInt((e.target as HTMLElement).getAttribute("data-col")!);
						this.last_hover = [r, c];
						this.doHighlight(r, c);
					}
				}, false);
				cell.addEventListener("mouseout", e => {
					if(this.placing_ship && (e.relatedTarget == null ||
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
					this.placing_ship = shipclass;
					this.cancel_place.setAttribute("data-enabled", "");
					this.rotate_place.setAttribute("data-enabled", "");
				}
			}, false);
			this.ships.push(ship);
			this.ships_elem.appendChild(ship);
		}
		this.cancel_place.addEventListener("mousedown", () => {
			this.placing_ship = +false;
			this.endShipPlacement();
			this.clearHighlight();
		}, false);
		this.rotate_place.addEventListener("mousedown", () => {
			this.direction_row = !this.direction_row;
		}, false);
		window.addEventListener("keypress", e => {
			if(this.placing_ship) {
				if(e.key == "r" || e.key == "R")
					this.direction_row = !this.direction_row;
				if(this.last_hover != null) {
					let _lastHover = this.last_hover;
					this.clearHighlight();
					this.doHighlight(_lastHover[0], _lastHover[1]);
					this.last_hover = _lastHover;
				}
			}
		}, false);
	}
	endShipPlacement() {
		this.placing_ship = +false;
		this.ship = null;
		this.clearHighlight();
		this.cancel_place.removeAttribute("data-enabled");
		this.rotate_place.removeAttribute("data-enabled");
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
		this.last_hover = null;
	}
	doHighlight(r: number, c: number) {
		if(this.direction_row) {
			c -= Math.ceil(this.placing_ship / 2) - 1;
			if(c <= 0)
				c = 0;
			if(c + this.placing_ship >= this.grid[r].length)
				c = this.grid[r].length - this.placing_ship;
			let valid = true;
			for(let _c = 0; _c < this.placing_ship; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				if(this.grid[r][c + _c].hasAttribute("data-ship"))
					valid = false;
			}
			for(let _c = 0; _c < this.placing_ship; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				this.grid[r][c + _c].setAttribute(valid ? "data-highlight" : "data-highlight-invalid", "");
			}
		} else {
			r -= Math.ceil(this.placing_ship / 2) - 1;
			if(r <= 0)
				r = 0;
			if(r + this.placing_ship >= this.grid.length)
				r = this.grid.length - this.placing_ship;
			let valid = true;
			for(let _r = 0; _r < this.placing_ship; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				if(this.grid[r + _r][c].hasAttribute("data-ship"))
					valid = false;
			}
			for(let _r = 0; _r < this.placing_ship; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				this.grid[r + _r][c].setAttribute(valid ? "data-highlight" : "data-highlight-invalid", "");
			}
		}
	}
	placeShip(r: number, c: number) {
		if(this.direction_row) {
			c -= Math.ceil(this.placing_ship / 2) - 1;
			if(c <= 0)
				c = 0;
			if(c + this.placing_ship >= this.grid[r].length)
				c = this.grid[r].length - this.placing_ship;
			let valid = true;
			for(let _c = 0; _c < this.placing_ship; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				if(this.grid[r][c + _c].hasAttribute("data-ship"))
					valid = false;
			}
			if(!valid)
				return false;
			for(let _c = 0; _c < this.placing_ship; _c++) {
				if(c + _c >= this.grid[r].length) // safeguard
					break;
				this.grid[r][c + _c].setAttribute("data-ship", "");
				if(_c != this.placing_ship - 1)
					this.grid[r][c + _c].setAttribute("data-hull-right", "");
			}
		} else {
			r -= Math.ceil(this.placing_ship / 2) - 1;
			if(r <= 0)
				r = 0;
			if(r + this.placing_ship >= this.grid.length)
				r = this.grid.length - this.placing_ship;
			let valid = true;
			for(let _r = 0; _r < this.placing_ship; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				if(this.grid[r + _r][c].hasAttribute("data-ship"))
					valid = false;
			}
			if(!valid)
				return false;
			for(let _r = 0; _r < this.placing_ship; _r++) {
				if(r + _r >= this.grid.length) // safeguard
					break;
				this.grid[r + _r][c].setAttribute("data-ship", "");
				if(_r != this.placing_ship - 1)
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
