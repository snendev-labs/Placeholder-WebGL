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

function makeShaderProgram(gl, vert_id, frag_id){
  var vsrc = document.getElementById(vert_id).text;
  var fsrc = document.getElementById(frag_id).text;
  var vert = createShader(gl, gl.VERTEX_SHADER, vsrc);
  var frag = createShader(gl, gl.FRAGMENT_SHADER, fsrc);
  return createProgram(gl, vert, frag);
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

function renderGame(){
  //initialize
  var canvas = document.getElementById("canv");
  var gl = canvas.getContext("webgl");
  if(!gl) {
    return;
  }
  var program = makeShaderProgram(gl, "vert", "frag");

  //render
  gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  //shader inputs
  var posAttrLoc = gl.getAttribLocation(program, "pos");
  var uvAttrLoc = gl.getAttribLocation(program, "uvcoord");
  var resUnifLoc = gl.getUniformLocation(program, "ures");
  var colUnifLoc = gl.getUniformLocation(program, "col");
  var texUnifLoc = gl.getUniformLocation(program, "_tex");
  var posBuf = gl.createBuffer();
  var uvBuf = gl.createBuffer();

  //bind resolution uniform
  gl.uniform2f(resUnifLoc, gl.canvas.width, gl.canvas.height);

  //create / bind texture
  makeTexture(gl);
  //set up texcoords
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.enableVertexAttribArray(uvAttrLoc);
  gl.vertexAttribPointer(uvAttrLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([
      //one quad, just like they were drawn
      0,1, 1,1, 0,0,
      0,0, 1,1, 1,0,
    ]),
    gl.STATIC_DRAW
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(posAttrLoc);
  gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

  //draw
  var count = 6;
  var wTile = canvas.width/wBoard;
  var hTile = canvas.height/hBoard;
  for(var j=0; j<hBoard; j++){
    if(j%4 == 0){
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBasic);
    } else if(j%4 == 1){
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texLand);
    } else if(j%4 == 2){
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBank);
    } else{
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texBase);
    }
    for(var i=0; i<wBoard; i++){
      drawUnitTile(gl, i*wTile, j*hTile, wTile, hTile);
      var r = parseFloat((i*wTile/canvas.width).toFixed(4));
      var g = parseFloat(((i*wTile+j*hTile)/(canvas.width+canvas.height)).toFixed(4));
      var b = parseFloat((j*hTile/canvas.height).toFixed(4));
      gl.uniform3f(colUnifLoc, r, g, b);
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
  }
}

function renderSnake(){
  var canvas = document.getElementById("snake");
  var gl = canvas.getContext("webgl");
  if(!gl) {
    return;
  }
  var program = makeShaderProgram(gl, "snakevert", "snakefrag");

  //render
  gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  //shader inputs
  var posAttrLoc = gl.getAttribLocation(program, "pos");
  var resUnifLoc = gl.getUniformLocation(program, "ures");
  var colUnifLoc = gl.getUniformLocation(program, "col");
  var posBuf = gl.createBuffer();

  //bind resolution uniform
  gl.uniform2f(resUnifLoc, gl.canvas.width, gl.canvas.height);

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(posAttrLoc);
  gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);
  //begin loop
  var snakeCoordsX = [25,26,27,28,29];
  var snakeCoordsY = [15,15,15,15,15];

  snakeLoop(gl, canvas, colUnifLoc, snakeCoordsX, snakeCoordsY);
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
    gl.uniform3f(colUnifLoc, .8, .8, .8);
    gl.drawArrays(gl.TRIANGLES,0,count);
  }
  window.setTimeout(snakeLoop, 120, gl, canvas, colUnifLoc, x, y);
}

function moveSnake(x,y){
  x.pop();
  y.pop();
  var newX;
  var newY;
  if(dir == UP){
    newX = x[0];
    newY = (y[0]+1)%hSnake;
  } else if(dir == RIGHT){
    newX = (x[0]+1)%wSnake;
    newY = y[0];
  } else if(dir == DOWN){
    newX = x[0];
    newY = (y[0]-1 > -1) ? y[0]-1 : hSnake-1;
  } else if(dir == LEFT){
    newX = (x[0]-1 > -1) ? x[0]-1 : wSnake-1;
    newY = y[0];
  }
  x.unshift(newX);
  y.unshift(newY);
}

function addKeyDownHandler() {
  document.addEventListener("keydown", function(event) {
    if(event.key.toLowerCase()=="w") {
      console.log("up");
      dirQue.push(UP);
    }
    if(event.key.toLowerCase()=="d") {
      console.log("right");
      dirQue.push(RIGHT);
    }
    if(event.key.toLowerCase()=="s") {
      console.log("down");
      dirQue.push(DOWN);
    }
    if(event.key.toLowerCase()=="a") {
      console.log("left");
      dirQue.push(LEFT);
    }
  });
}
document.addEventListener('DOMContentLoaded', addKeyDownHandler, false);

const UP=0;
const RIGHT=1;
const DOWN=2;
const LEFT=3;
const wBoard = 10;
const hBoard = 10;
const wSnake = 30;
const hSnake = 30;
var dir = LEFT;
var dirQue = [];
var snakeover = 0;
//var normalColor;
//var grassColor;
//var mtnColor;
var texBasic = new Image();
texBasic.src = "assets/blank_tex.png";
var texLand = new Image();
texLand.src = "assets/land_tex.png";
var texBase = new Image();
texBase.src = "assets/home_tex.png";
var texBank = new Image();
texBank.src = "assets/bank_tex.png";
texBasic.onload = function(){
  renderGame();
  renderSnake();
};
