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

  //begin loop
  var snakeCoordsX = [25,26,27,28,29];
  var snakeCoordsY = [15,15,15,15,15];
  var snakeCoords = [];
  var xRand = Math.floor(Math.random()*wBoard);
  var yRand = Math.floor(Math.random()*hBoard);
  var startDir = Math.floor(Math.random()*4);

  snakegl.uniform3f(snakeColLoc, .8, .8, .8);
  //draw
  drawBoard(boardgl, boardcanv, boardColLoc);
  snakeLoop(snakegl, snakecanv, snakeColLoc, snakeCoordsX, snakeCoordsY);
}

function drawBoard(gl, canvas, colUnifLoc){
  var count = 6;
  var wTile = canvas.width/wBoard;
  var hTile = canvas.height/hBoard;
  for(var j=0; j<hBoard; j++){
    for(var i=0; i<wBoard; i++){
      switch(map[j][i].type){
        case NOTYPE:
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBasic);
          break;
        case LAND:
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texLand);
          break;
        case BANK:
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBank);
          break;
        case BASE:
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBase);
          break;
        default:
          console.log("no tile type i="+toString(i)+" j="+toString(j));
      }
      drawUnitTile(gl, i*wTile, j*hTile, wTile, hTile);
      gl.uniform3f(colUnifLoc, map[j][i].color[0], map[j][i].color[1], map[j][i].color[2]);
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
  }
}

function snakeLoop(gl, canvas, colUnifLoc, x, y){
  if(dirQue.length > 0 && (dir+2)%4 != dirQue[0]){
    dir = dirQue.shift();
  } else {
    dirQue.shift();
  }
  moveSnake(x,y);
  //draw
  var count = 6;
  gl.clear(gl.COLOR_BUFFER_BIT);
  var wTile = canvas.width/wSnake;
  var hTile = canvas.height/hSnake;
  for(var i=0; i<x.length; i++){
    drawUnitTile(gl, x[i]*wTile, y[i]*hTile, wTile, hTile);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  if(!snakeover){
    window.setTimeout(snakeLoop, 120, gl, canvas, colUnifLoc, x, y);
  }
}

function moveSnake(x,y){
  x.pop();
  y.pop();
  var newX;
  var newY;
  switch(dir){
    case UP:
      newX = x[0];
      newY = (y[0]+1)%hSnake;
      break;
    case RIGHT:
      newX = (x[0]+1)%wSnake;
      newY = y[0];
      break;
    case DOWN:
      newX = x[0];
      newY = (y[0]-1 > -1) ? y[0]-1 : hSnake-1;
      break;
    case LEFT:
      newX = (x[0]-1 > -1) ? x[0]-1 : wSnake-1;
      newY = y[0];
      break;
  }
  if(pointInSnake(newX, newY, x, y)){
    snakeover = 1;
  }
  x.unshift(newX);
  y.unshift(newY);
}

function pointInSnake(nx, ny, xarr, yarr){
  for(var i=0; i<xarr.length; i++){
    if(xarr[i]==nx && yarr[i]==ny){
      return 1;
    }
  }
  return 0;
}

function createMap(){
  var m = [];
  var c;
  for(var j=0; j<hBoard; j++){
    var row = [];
    var a;
    for(var i=0; i<wBoard; i++){
      if(playerLocation[0] == i && playerLocation[1] == j){
        c = highlightColor; //change to outline in second pass
      } else{
        var k = Math.random()*100;
        if(k<60){
          c = normalColor;
        } else if(k<85){
          c = grassColor;
        } else{
          c = mtnColor;
        }
      }
      k = i+j*wBoard;
      if(k%23 == 0){
        a = LAND;
      } else if(k%23 == 11){
        a = BANK;
      } else if(k%23 == 18){
        a = BASE;
      } else{
        a = NOTYPE;
      }
      row.push({
        color : c,
        type : a
      });
    }
    m.push(row);
  }
  return m;
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
});

const UP=0;
const RIGHT=1;
const DOWN=2;
const LEFT=3;
const wBoard = 10;
const hBoard = 10;
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
const NOTYPE=0;
const LAND=1;
const BANK=2;
const BASE=3;
//fourth object adds extra points to grab to game

//context types
const PAUSE=0;
const BOARD=1;
const SNAKE=2;

//control variables
var dir = LEFT;
var dirQue = [];
var snakeover = 0;

//game variables
var hp = 5;
var banks = 0;
var numBits = 1;
var numBossBeaten = 0;
var difficulty = Math.floor(diffScaling*diffMin/(diffScaling+numBossBeaten));
var playerLocation = [4,4];
var playerContext = BOARD;


var map = createMap();

/*function TextDisplay($scope){
  var dispHP;
  var dispLoc;
  $scope.StartGame = function StartGame(){
    dispHp = "HP: " + toString(hp);
    dispLoc = "Location: "+toString(playerLocation[0])+","+toString(playerLocation[1]);
    $scope.$apply();
  }
}*/

//assets
var texBasic = new Image();
texBasic.src = "assets/blank_tex.png";
var texLand = new Image();
texLand.src = "assets/land_tex.png";
var texBase = new Image();
texBase.src = "assets/home_tex.png";
var texBank = new Image();
texBank.src = "assets/bank_tex.png";
texBasic.onload = function(){render();};
