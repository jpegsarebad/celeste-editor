function readFile(e) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = e => cart(e);
  reader.readAsBinaryString(file);
}

const map_array = new Array(64);
for (let i = 0; i < map_array.length; i++) {
  map_array[i] = new Array(128);
}

const sprites = [];
const scale = 4;

const levelCanvas = document.getElementById("level-canvas");
const levelContext = levelCanvas.getContext("2d");
levelCanvas.width = 512;
levelCanvas.height = 512;
levelContext.imageSmoothingEnabled = false;
levelContext.scale(scale, scale);

const sheetCanvas = document.getElementById("sheet-canvas");
const sheetContext = sheetCanvas.getContext("2d");
sheetCanvas.width = 512;
sheetCanvas.height = 256;
sheetContext.imageSmoothingEnabled = false;
sheetContext.scale(scale, scale);

let levelId;
let sheetSource;

function getLevelImage(id) {
  let start_x = id % 8 * 16;
  let start_y = Math.floor(id / 8) * 16;

  let lvl_img = document.createElement("canvas");
  let lvl_ctx = lvl_img.getContext("2d");
  lvl_img.width = 128;
  lvl_img.height = 128;

  for (let y = start_y; y < start_y + 16; y++) {
    for (let x = start_x; x < start_x + 16; x++) {
      let index = Number(map_array[y][x]);
      lvl_ctx.putImageData(sprites[index], (x - start_x) * 8, (y - start_y) * 8);
    }
  }

  return lvl_img.toDataURL();
}

let cart_data;

function cart(e) {
  const colors = [
    [0, 0, 0],
    [29, 43, 83],
    [126, 37, 83],
    [0, 135, 81],
    [171, 82, 54],
    [95, 87, 79],
    [194, 195, 199],
    [255, 241, 232],
    [255, 0, 77],
    [255, 163, 0],
    [255, 236, 39],
    [0, 228, 54],
    [41, 173, 255],
    [131, 118, 156],
    [255, 119, 168],
    [255, 204, 170]
  ];

  const contents = e.target.result;

  cart_data = contents.split(/__lua__|__gfx__|__label__|__gff__|__map__|__sfx__|__music__/);
  const map_data = cart_data[5].replace(/\n/ig, ""),
    gfx_data = cart_data[2].replace(/\n/ig, "");

  let x = 0;
  let y = 0;
  for (let i = 0; i < map_data.length; i += 2) {
    let tile_hex = map_data[i] + map_data[i + 1];
    let tile_int = parseInt(tile_hex, 16);
    map_array[y][x] = tile_int;

    if (x >= 127) {
      y++;
      x = 0;
    } else {
      x++;
    }
  }

  // Convert shared bottom half of graphics to map data
  x = 0;
  y = 32;
  for (let i = Math.floor(gfx_data.length / 2); i < gfx_data.length; i += 2) {
    let tile_hex = gfx_data[i + 1] + gfx_data[i];
    let tile_int = parseInt(tile_hex, 16);
    map_array[y][x] = tile_int;

    if (x >= 127) {
      y++;
      x = 0;
    } else {
      x++;
    }
  }

  const gfx_img = document.createElement("canvas");
  let gfx_ctx = gfx_img.getContext("2d");
  gfx_img.width = 128;
  gfx_img.height = 64;

  x = 0;
  y = 0;
  for (let i = 0; i < gfx_data.length / 2; i++) {
    let color_int = parseInt(gfx_data[i], 16);

    let rgb = colors[color_int];
    gfx_ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
    gfx_ctx.fillRect(x, y, 1, 1);

    if (x >= 127) {
      y++;
      x = 0;
    } else {
      x++;
    }
  }

  sheetSource = gfx_img.toDataURL();

  for (let i = 0; i < 1024; i += 8) {
    let x = i % 128;
    let y = Math.floor(i / 128) * 8;
    let spr_image = gfx_ctx.getImageData(x, y, 8, 8);
    sprites.push(spr_image);
  }

  document.body.removeChild(document.getElementById("file-input"));
  let showIds = ["level-container", "sheet-canvas"/*, "save", "save-as"*/];
  for (let id of showIds) document.getElementById(id).classList.remove("display-none");

  let levelBack = document.getElementById("level-back");
  let levelNext = document.getElementById("level-next");
  levelId = 0;

  levelBack.addEventListener("click", () => {
    levelId--;
    if (levelId < 0) levelId = 31;

    let img = new Image();
    img.src = getLevelImage(levelId);
    img.onload = () => levelContext.drawImage(img, 0, 0);
  }, false);

  levelNext.addEventListener("click", () => {
    levelId++;
    levelId = levelId % 32;

    let img = new Image();
    img.src = getLevelImage(levelId);
    img.onload = () => levelContext.drawImage(img, 0, 0);
  }, false);

  requestAnimationFrame(update);
}

document.getElementById("file-input").addEventListener("change", readFile, false);

// Scope mousex and mousey to be global so they can be set from within an event listener
let levelMouseX = 0, 
  levelMouseY = 0,
  sheetMouseX = 0,
  sheetMouseY = 0,
  sheetSelected = 0,
  tileSheetX = 0,
  tileSheetY = 0;

levelCanvas.addEventListener("mousemove", e => {
  levelMouseX = e.clientX;
  levelMouseY = e.clientY;
}, false);

sheetCanvas.addEventListener("mousemove", e => {
  sheetMouseX = e.clientX;
  sheetMouseY = e.clientY;
}, false);

sheetCanvas.addEventListener("mousedown", () => {
  sheetSelected = tileSheetX + (tileSheetY * 16);
}, false);

let levelMouseDown = false;
let levelMouse = false;
let sheetMouse = false;

levelCanvas.addEventListener("mousedown", () => levelMouseDown = true, false);
levelCanvas.addEventListener("mouseup", () => levelMouseDown = false, false);

levelCanvas.addEventListener("mouseenter", () => levelMouse = true, false);
levelCanvas.addEventListener("mouseout", () => {
  levelMouse = false;
  levelMouseDown = false;
}, false);

sheetCanvas.addEventListener("mouseenter", () => sheetMouse = true, false);
sheetCanvas.addEventListener("mouseout", () => sheetMouse = false, false);

function update() {

  // Draw the current level
  let levelImg = new Image();
  levelImg.src = getLevelImage(levelId);
  levelImg.onload = () => levelContext.drawImage(levelImg, 0, 0);

  // Adjust mouse position relative to canvas
  let rect = levelCanvas.getBoundingClientRect();
  let x = levelMouseX - rect.left;
  let y = levelMouseY - rect.top;

  // Convert mouse coordinates to tile locations
  let tileMapX = Math.floor(x / (8 * scale));
  let tileMapY = Math.floor(y / (8 * scale));

  // Draw translucent sprite over hovered tile
  if (levelMouse) {
    let spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = 8;
    spriteCanvas.height = 8;
    spriteCanvas.getContext("2d").putImageData(sprites[sheetSelected], 0, 0)

    let selectedImg = new Image();
    selectedImg.src = spriteCanvas.toDataURL();
    levelContext.save();
    levelContext.globalAlpha = 0.5;
    levelContext.drawImage(selectedImg, tileMapX * 8, tileMapY * 8);
    levelContext.restore();

    let levelTileOffsetX = (levelId % 8) * 16;
    let levelTileOffsetY = Math.floor(levelId / 8) * 16;

    if (levelMouseDown &&
        typeof map_array[tileMapY + levelTileOffsetY][tileMapX + levelTileOffsetX] !== undefined) {
      map_array[tileMapY + levelTileOffsetY][tileMapX + levelTileOffsetX] = sheetSelected;
    }
  }

  // Draw the spritesheet
  let sheetImg = new Image();
  sheetImg.src = sheetSource;
  sheetImg.onload = () => sheetContext.drawImage(sheetImg, 0, 0);

  // Adjust mouse position relative to canvas
  let rect2 = sheetCanvas.getBoundingClientRect();
  let x2 = sheetMouseX - rect2.left + 1;
  let y2 = sheetMouseY - rect2.top;

  // Convert mouse coordinates to tile locations
  tileSheetX = Math.floor(x2 / (8 * scale));
  tileSheetY = Math.floor(y2 / (8 * scale));

  // Draw translucent white square over hovered tile
  if (sheetMouse) {
    sheetContext.fillStyle = "#FFFFFF40";
    sheetContext.fillRect(tileSheetX * 8, tileSheetY * 8, 8, 8);
  }
  
  sheetContext.strokeStyle = "white";
  sheetContext.strokeRect((sheetSelected % 16) * 8 - .5, Math.floor(sheetSelected / 16) * 8 - .5, 9, 9);
  sheetContext.strokeStyle = "black";
  sheetContext.strokeRect((sheetSelected % 16) * 8 - 1.5, Math.floor(sheetSelected / 16) * 8 - 1.5, 11, 11);
  
  // Call function recursively using requestAnimationFrame to keep a constant framerate
  requestAnimationFrame(update);
}

function getSaveData() {
  let mapString = "\n";
  for (let y = 0; y < map_array.length / 2; y++) {
    for (let x of map_array[y]) {
      mapString += x.toString(16).padStart(2, "0");
    }
    mapString += "\n";
  }

  let gfxString = "\n";
  for (let y = map_array.length / 2; y < map_array.length; y++) {
    for (let x = 0; x < map_array[y].length / 2; x++) {
      let hex = map_array[y][x].toString(16).padStart(2, "0");
      gfxString += hex[1] + hex[0];
    }
    gfxString += "\n";
    for (let x = map_array[y].length / 2; x < map_array[y].length; x++) {
      let hex = map_array[y][x].toString(16).padStart(2, "0");
      gfxString += hex[1] + hex[0];
    }
    gfxString += "\n";
  }
  
  return cart_data[0] + "__lua__" + cart_data[1] + "__gfx__" + cart_data[2].slice(0, cart_data[2].length / 2) + gfxString + "__label__" + cart_data[3] + "__gff__" + cart_data[4] + "__map__" + mapString + "__sfx__" + cart_data[6] + "__music__" + cart_data[7];
}

/*
let savePath;
document.getElementById("save").addEventListener("click", () => {  
  if (savePath === undefined) {
    dialog.showSaveDialog({
      title: "Save p8 Cartridge",
      defaultPath: os.homedir(),
      filters: [{
        name: "Pico-8",
        extensions: ["p8"]
      }]
    }, (path) => {
      if (path !== "") {
        savePath = path;
      }
      fs.writeFile(savePath, getSaveData(), function(err) {
        if (err !== null) {
          dialog.showErrorBox('File save error', err.message);
        }
      });
    });
  } else {
    fs.writeFile(savePath, getSaveData(), function(err) {
      if (err !== null) {
        dialog.showErrorBox('File save error', err.message);
      }
    });
  }
}, false);

document.getElementById("save-as").addEventListener("click", () => {
  dialog.showSaveDialog({
    title: "Save p8 Cartridge",
    defaultPath: os.homedir(),
    filters: [{
      name: "Pico-8",
      extensions: ["p8"]
    }]
  }, (path) => {
    if (path !== "") {
      savePath = path;
      fs.writeFile(savePath, getSaveData(), function(err) {
        if (err !== null) {
          dialog.showErrorBox('File save error', err.message);
        }
      });
    }
  });
}, false);*/

document.addEventListener("keydown", e => {
  if (levelId !== undefined) {
    switch (e.code) {
      case "ArrowLeft":
        levelId--;
        if (levelId < 0) levelId = 31;
        break;
      case "ArrowRight":
        levelId++;
        levelId = levelId % 32;
        break;
    }
  }
}, false);