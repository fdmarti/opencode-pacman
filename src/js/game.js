// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

const POWER_DURATION = 15;               // segundos del efecto de un power pellet
const GHOST_POINTS = [ 200, 400, 800, 1600 ]; // por fantasma comido en el mismo efecto

// Puerta de la pen (fila 12, cols 13-14 del laberinto). Columna fija de salida.
const PEN_DOOR_X = 13;
const PEN_DOOR_Y = 12;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  // Cuenta dots (2) y power pellets (4): ganar el nivel exige comerlos todos.
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    playTime: 0,  // segundos de juego (se cuentan desde que state === 'playing')
    powerTimer: 0, // segundos restantes del efecto; 0 = sin efecto
    ghostCombo: 0, // fantasmas comidos dentro del efecto actual
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseDelay: g.releaseDelay, // demora original (segundos)
      releaseAt: g.releaseDelay,    // playTime en el que pasa de 'waiting' a 'leaving'
      mode: 'waiting', // 'waiting' | 'leaving' | 'active'
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
      playSound( 'dot' );
    }
    // Comer power pellet: +50 y activa el efecto (fresco, no hay efecto previo).
    if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 50;
      game.dotsRemaining--;
      game.powerTimer = POWER_DURATION;
      game.ghostCombo = 0;
      playSound( 'power' );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo de la personalidad de cada fantasma activo.
//   blinky -> celda actual de Pacman.
//   pinky  -> 4 celdas delante de Pacman en su direccion.
//   inky   -> duplica el vector desde Blinky hasta 2 celdas delante de Pacman.
//   clyde  -> Pacman si esta a mas de 8 celdas Manhattan; si no, esquina inferior
//             izquierda del laberinto.
// Devuelve la celda objetivo; null solo si el kind es desconocido.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( g.kind === 'blinky' ) return { x: px, y: py };

  if ( g.kind === 'pinky' ) {
    const d = DIRS[ p.dir ];
    return { x: px + d.x * 4, y: py + d.y * 4 };
  }

  if ( g.kind === 'inky' ) {
    const d = DIRS[ p.dir ];
    const ax = px + d.x * 2; // celda 2 posiciones delante de Pacman (ancla)
    const ay = py + d.y * 2;
    const blinky = game.ghosts.find( ( gh ) => gh.kind === 'blinky' );
    if ( !blinky ) return { x: ax, y: ay };
    // Vector Blinky->ancla duplicado y aplicado desde Blinky.
    return {
      x: blinky.x + 2 * ( ax - blinky.x ),
      y: blinky.y + 2 * ( ay - blinky.y ),
    };
  }

  if ( g.kind === 'clyde' ) {
    const dist = Math.abs( px - g.x ) + Math.abs( py - g.y );
    if ( dist > 8 ) return { x: px, y: py };
    return { x: 0, y: game.grid.length - 1 }; // esquina inferior izquierda
  }

  return null;
}

// Elige en la interseccion la direccion valida (sin invertir, salvo callejon)
// cuyo siguiente paso reduce mas la distancia Manhattan hacia el objetivo.
function chaseDirection( g, choices, target ) {
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Efecto de power pellet activo: en lugar de perseguir, direccion aleatoria
  // entre las validas (mismas reglas de giro que la persecucion).
  if ( game.powerTimer > 0 ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Aplica la personalidad solo a fantasmas activos (moveGhost lo garantiza).
  const target = ghostTarget( game, g );
  if ( !target ) return; // kind sin personalidad: conserva la direccion actual
  g.dir = chaseDirection( g, choices, target );
}

// Camino guiado del modo 'leaving': primero alinear en la columna de la puerta
// (fila 14 esta completamente abierta dentro de la pen) y luego subir por ella.
function guideLeaving( g ) {
  if ( g.x !== PEN_DOOR_X ) g.dir = g.x < PEN_DOOR_X ? 'right' : 'left';
  else g.dir = 'up';
}

function moveGhost( game, g ) {
  // Un fantasma esperando su demora permanece inmóvil en la pen.
  if ( g.mode === 'waiting' ) return;

  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // La IA normal solo se aplica tras cruzar la puerta (celda por encima).
    if ( g.mode === 'leaving' && g.y < PEN_DOOR_Y ) g.mode = 'active';
    if ( g.mode === 'leaving' ) guideLeaving( g );
    else if ( g.mode === 'active' ) decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Cada vida arranca en las mismas condiciones: pen, modo waiting y reloj en 0.
  game.playTime = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.mode = 'waiting';
    // La demora se cuenta desde el reinicio del reloj (releaseAt es un sello
    // sobre playTime, no un contador acumulado).
    g.releaseAt = g.releaseDelay;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Pasa a 'leaving' cada fantasma cuya demora ya se cumplio en el reloj de juego.
function releaseGhosts( game ) {
  for ( const g of game.ghosts ) {
    if ( g.mode === 'waiting' && game.playTime >= g.releaseAt ) {
      g.mode = 'leaving';
    }
  }
}

function update( game ) {
  // Reloj de juego en segundos (60 fps nominal, como el resto del bucle).
  // Las demoras de salida de los fantasmas se miden contra este contador.
  if ( game.state === 'playing' ) {
    game.playTime += 1 / 60;
    // El efecto de los power pellets se agota en el mismo reloj.
    if ( game.powerTimer > 0 ) {
      game.powerTimer -= 1 / 60;
      if ( game.powerTimer < 0 ) game.powerTimer = 0;
    }
  }
  releaseGhosts( game );

  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( !collides( game.pacman, g ) ) continue;

    // Con el efecto activo, un fantasma 'active' es comido (Pacman invencible);
    // uno no active no hace nada. Fuera del efecto todo sigue costando una vida.
    if ( game.powerTimer > 0 ) {
      if ( g.mode !== 'active' ) continue;
      game.score += GHOST_POINTS[ Math.min( game.ghostCombo, 3 ) ];
      game.ghostCombo++;
      playSound( 'ghost' );
      // Vuelve a su celda de la pen y espera su demora original desde el retorno.
      const start = GHOST_STARTS.find( ( s ) => s.kind === g.kind ) || GHOST_STARTS[ 0 ];
      g.x = start.x;
      g.y = start.y;
      g.dir = 'up';
      g.mode = 'waiting';
      g.releaseAt = game.playTime + g.releaseDelay;
      continue;
    }

    game.lives--;
    playSound( 'death' );
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
