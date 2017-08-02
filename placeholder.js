"use strict";

function initGL(canvas){
  var gl = canvas.getContext("webgl");
  if(!gl) {
    return;
  }
  gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return gl;
}

function createShader(gl, type, source){
  var shader = gl.createShader(type);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if(success){
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vert, frag){
  var program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if(success){
    return program;
  }
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function makeShaderProgram(gl, vert_id, frag_id){
  var vsrc = document.getElementById(vert_id).text;
  var fsrc = document.getElementById(frag_id).text;
  var vert = createShader(gl, gl.VERTEX_SHADER, vsrc);
  var frag = createShader(gl, gl.FRAGMENT_SHADER, fsrc);
  return createProgram(gl, vert, frag);
}

function setShaderAttribute(gl, program, shadervar){
  var loc = gl.getAttribLocation(program, shadervar);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  return buf;
}

function setResolutionUniform(gl, program){
  var loc = gl.getUniformLocation(program, "ures");
  gl.uniform2f(loc, gl.canvas.width, gl.canvas.height);
}

function makeTexture(gl){
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  return texture;
}

function drawUnitTile(gl,x,y,w,h){
  var x2 = x+w;
  var y2 = y+h;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x , y ,
    x2, y ,
    x , y2,
    x , y2,
    x2, y ,
    x2, y2]), gl.STATIC_DRAW);
  gl.drawArrays(gl.TRIANGLES,0,6);
}

function render(){
  //initialize
  var boardcanv = document.getElementById("canv");
  var snakecanv = document.getElementById("snake");
  var boardgl = initGL(boardcanv);
  var snakegl = initGL(snakecanv);
  var boardprog = makeShaderProgram(boardgl, "vert", "frag");
  var snakeprog = makeShaderProgram(snakegl, "snakevert", "snakefrag");

  //begin render program
  boardgl.useProgram(boardprog);
  snakegl.useProgram(snakeprog);

  //shader attributes
  var uvBoardBuf = setShaderAttribute(boardgl, boardprog, "uvcoord");
  boardgl.bufferData(boardgl.ARRAY_BUFFER,
    new Float32Array([0,1, 1,1, 0,0,0,0, 1,1, 1,0]),
    boardgl.STATIC_DRAW
  );
  var posBoardBuf = setShaderAttribute(boardgl, boardprog, "pos");
  var posSnakeBuf = setShaderAttribute(snakegl, snakeprog, "pos");

  //shader uniforms
  setResolutionUniform(boardgl, boardprog);
  setResolutionUniform(snakegl, snakeprog);
  var boardColLoc = boardgl.getUniformLocation(boardprog, "col");
  var snakeColLoc = snakegl.getUniformLocation(snakeprog, "col");

  //create / bind texture
  makeTexture(boardgl);

  //begin game loop
  tileSelect = 0;
  boardLoop(boardgl, boardcanv, boardColLoc);
  snakeLoop(snakegl, snakecanv, snakeColLoc);
}

function boardLoop(gl, canvas, colUnifLocB){
  if(playerContext == BOARD){
    updateBoardStatText();
    if(dirQue.length > 0){
      playerLocation = move(playerLocation, dirQue.shift());
      console.log("player: ("+playerLocation[0]+","+playerLocation[1]+")");
    }
    var wTile = canvas.width/wBoard;
    var hTile = canvas.height/hBoard;
    var curTex;
    gl.clear(gl.COLOR_BUFFER_BIT);
    for(var j=0; j<hBoard; j++){
      for(var i=0; i<wBoard; i++){
        var playerOnTile = (i==playerLocation[0] && j==playerLocation[1]);
        switch(map[j][i].build){
          case NONE:
            curTex = playerOnTile ? texHlNone : texNone;
            break;
          case LAND:
            curTex = playerOnTile ? texHlLand : texLand;
            break;
          case BANK:
            curTex = playerOnTile ? texHlBank : texBank;
            break;
          case BASE:
            curTex = playerOnTile ? texHlBase : texBase;
            break;
          default:
            console.log("no tile type at i="+toString(i)+" j="+toString(j));
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, curTex);
        gl.uniform3f(colUnifLocB, map[j][i].color[0], map[j][i].color[1], map[j][i].color[2]);
        drawUnitTile(gl, i*wTile, j*hTile, wTile, hTile);
      }
    }
    if(tileSelect && map[playerLocation[0]][playerLocation[1]].build == NONE){
      difficulty = Math.floor(diffScaling*diffMin/(diffScaling+numBossBeaten));
      createSnake();
      for(var k = 0; k < numFood; k++){
        addSnakeFood();
      }
      playerContext = SNAKE;
      tileSelect = 0;
    }
  }
  window.setTimeout(boardLoop, 20, gl, canvas, colUnifLocB);
}

function snakeLoop(gl, canvas, colUnifLocS){
  if(playerContext == SNAKE){
    updateSnakeStatText();
    if(dirQue.length > 0){
      if(dirQue[0] != (dir+2)%4){
        dir = dirQue.shift();
      } else {
        dirQue.shift();
      }
    }
    var newpt = move(snakeCoords[0], dir);
    var foodIndex = pointInXyArr(snakeFood, newpt);
    if(foodIndex != -1){
      snakeFood.splice(foodIndex,1);
      snakeScore++;
      addSnakeFood();
    } else{
      snakeCoords.pop();
    }
    if(pointInXyArr(snakeCoords, newpt) != -1){
      snakeover = true;
    }
    snakeCoords.unshift(newpt);
    if(snakeTimer == difficulty){
      snakeCoords.pop();
      snakeTimer = 0;
      if(snakeCoords.length == 0){
        snakeover = true;
      }
    }
    //draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    var wTile = canvas.width/wSnake;
    var hTile = canvas.height/hSnake;
    gl.uniform3f(colUnifLocS, .8, .8, .8);
    for(var i=0; i<snakeCoords.length; i++){
      drawUnitTile(gl, snakeCoords[i][0]*wTile, snakeCoords[i][1]*hTile, wTile, hTile);
    }
    gl.uniform3f(colUnifLocS, .6, .6, .6);
    for(var i=0; i<snakeFood.length; i++){
      drawUnitTile(gl, snakeFood[i][0]*wTile, snakeFood[i][1]*hTile, wTile, hTile);
    }
    snakeTimer++;
    if(snakeover){
      snakeCoords = [];
      snakeFood = [];
      playerContext = STORE;
      openStore();
      gl.clear(gl.COLOR_BUFFER_BIT);
      snakeover = false;
    }
  }
  window.setTimeout(snakeLoop, 120, gl, canvas, colUnifLocS);
}

function move(xy, d){
  switch(d){
    case UP:
      return [xy[0], (xy[1]+1)%hSnake];
    case RIGHT:
      return [(xy[0]+1)%wSnake, xy[1]];
    case DOWN:
      return [xy[0], ((xy[1]-1 > -1) ? xy[1]-1 : hSnake-1)];
    case LEFT:
      return [((xy[0]-1 > -1) ? xy[0]-1 : wSnake-1), xy[1]];
  }
}

function pointInXyArr(xyarr, newxy){
  for(var i=0; i<xyarr.length; i++){
    if(xyarr[i][0]==newxy[0] && xyarr[i][1]==newxy[1]){
      return i;
    }
  }
  return -1;
}

function createMap(){
  var m = [];
  var c;
  for(var j=0; j<hBoard; j++){
    var row = [];
    var a;
    for(var i=0; i<wBoard; i++){
      if(i==playerLocation[0] && j==playerLocation[1]){
        a = BASE;
        c = normalColor;
      } else{
        a = NONE;
        var k = Math.random()*100;
        if(k<60){
          c = normalColor;
        } else if(k<85){
          c = grassColor;
        } else{
          c = mtnColor;
        }
      }
      row.push({
        color : c,
        build : a
      });
    }
    m.push(row);
  }
  return m;
}

function createSnake(){
  var xy = [Math.floor(Math.random()*wSnake),Math.floor(Math.random()*hSnake)];
  var tailDir = Math.floor(Math.random()*4);
  for(var i=0; i<hp; i++){
    snakeCoords.push(xy);
    xy = move(xy,tailDir)
  }
  dir = (tailDir+2)%4;
}

function addSnakeFood(){
  while(true){
    var xy = [Math.floor(Math.random()*wSnake),Math.floor(Math.random()*hSnake)];
    if(pointInXyArr(snakeFood,xy) == -1 && pointInXyArr(snakeCoords,xy) == -1){
      break;
    }
  }
  snakeFood.push(xy);
}

$(document).keydown(function(event) {
  if(event.which==87 || event.which==38) {
    dirQue.push(UP);
  }
  if(event.which==68 || event.which==39) {
    dirQue.push(RIGHT);
  }
  if(event.which==83 || event.which==40) {
    dirQue.push(DOWN);
  }
  if(event.which==65 || event.which==37) {
    dirQue.push(LEFT);
  }
  if(event.which==82 && playerContext==SNAKE) {
    snakeover=1;
  }
  if(event.which==32 && playerContext==BOARD) {
    tileSelect=1;
  }
});

$("#startGame").click(function(){
  render();
});

function updateBoardStatText(){
  $("#hpStat").text("HP: "+hp);
  $("#locStat").text("Location: ("+playerLocation[0]+","+playerLocation[1]+")");
}

function updateSnakeStatText(){
  $("#scoreStat").text("Score: "+snakeScore);
}

function openStore(){
  //$("#Store").html("<span>Bank</span><button type='button'>Buy</button>");
  //change Store div to unhidden; set prices of buildings
}

function buy(){
  //map[playerLocation[0]][playerLocation[1]].build =
}

const UP=0;
const RIGHT=1;
const DOWN=2;
const LEFT=3;
const wBoard = 8;
const hBoard = 8;
const wSnake = 30;
const hSnake = 30;
const diffMin = 30;
const diffScaling = 10;

//tile colors
const normalColor = [.7,.7,.7];
const grassColor = [.13,.54,.13];
const mtnColor = [.54,.27,.07];
const highlightColor = [.85,.64,.13]

//building types
const NONE=0;
const LAND=1; //increases HP
const BANK=2; //increases storable $$
const BASE=3; //increases ???
const FARM=4; //increases # capture points in snake

//context types
const BOARD=0;
const SNAKE=1;
const STORE=2;

//control variables
var dir = LEFT;
var dirQue = [];
var snakeover = false;
var gameover = false;
var selectTile = 0;

//game variables
var hp = 4;
var banks = 0;
var numFood = 1;
var numBossBeaten = 0;
var difficulty = diffMin;
var playerLocation = [4,4];
var snakeCoords = [];
var snakeFood = [];
var snakeScore = 0;
var snakeTimer = 0;
var playerContext = BOARD;
var money = 0;

var map = createMap();

//assets
var texNone = new Image();
texNone.src = "assets/blank_tex.png";
var texLand = new Image();
texLand.src = "assets/land_tex.png";
var texBase = new Image();
texBase.src = "assets/base_tex.png";
var texBank = new Image();
texBank.src = "assets/bank_tex.png";
var texHlNone = new Image();
texHlNone.src = "assets/blank_highlighted.png";
var texHlLand = new Image();
texHlLand.src = "assets/land_highlighted.png";
var texHlBase = new Image();
texHlBase.src = "assets/base_highlighted.png";
var texHlBank = new Image();
texHlBank.src = "assets/bank_highlighted.png";
