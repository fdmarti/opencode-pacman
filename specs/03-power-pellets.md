# SPEC 03 — Power pellets, fantasmas comestibles y sonidos

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-10-28
> **Objective:** Añadir cuatro power pellets que vuelven comestibles a los fantasmas durante 15 segundos, junto con sonidos sintetizados de Web Audio para pellets, dots, fantasmas comidos y muerte de Pacman.

## Scope

**In:**

- Reemplazar el dot de las cuatro esquinas del laberinto por un power pellet: tile `4` (carácter `'o'`) en (1,3), (26,3), (1,26) y (26,26).
- Dibujar el power pellet más grande que un dot (radio 6) para distinguirlo a simple vista.
- Sumar 50 puntos y activar un efecto de 15 segundos al comer un power pellet.
- Durante el efecto, los fantasmas activos se dibujan alternando cyan `#00ffff` y blanco `#ffffff` cada 15 fotogramas.
- Durante el efecto, los fantasmas activos eligen dirección válida aleatoria en lugar de perseguir.
- Durante el efecto, Pacman es invencible: chocar con un fantasma activo se lo come en lugar de matarlo.
- Comer un fantasma da 200, 400, 800 o 1600 puntos según cuántos se coman dentro del mismo efecto.
- Un fantasma comido vuelve a su celda de la pen en modo `waiting`.
- Al terminar los 15 segundos, fantasmas e IA vuelven a la normalidad.
- Contar los cuatro power pellets en `dotsRemaining`: ganar el nivel exige comerlos.
- Crear `src/js/audio.js` con sonidos sintetizados por Web Audio API, sin archivos externos.
- Tocar un sonido al comer un dot (waka), al comer un power pellet, al comer un fantasma y al perder una vida.
- Silenciar y restaurar los sonidos con la tecla `m`.

**Out of scope (for future specs):**

- Archivos de audio externos (mp3/wav) o efectos con samples reales.
- Indicador de estado de sonido en el HUD o control de volumen gradual.
- Sonidos para victoria, derrota final, inicio de nivel o transiciones de estado.
- Ajustar la duración del efecto por nivel o hacerla configurable.
- Sprites de ojos para el fantasma comido o inversión de dirección al activarse el efecto.
- Que Pacman cambie de color o parpadee durante el efecto.
- Menos de cuatro pellets o posiciones distintas a las cuatro esquinas.
- Reducir la velocidad de los fantasmas asustados.

## Data model

`src/js/maze.js` añade el tile 4 al parseo y usa `'o'` en las cuatro esquinas de `MAZE_STR`:

```js
// parseTile: '#' → 1 · '.' → 2 · '-' → 3 · 'o' → 4 · ' ' → 0
```

`src/js/game.js` añade al estado de partida:

```js
powerTimer: 0,  // segundos restantes del efecto; 0 = sin efecto
ghostCombo: 0,  // fantasmas comidos dentro del efecto actual
```

Y define las constantes:

```js
const POWER_DURATION = 15; // segundos
const GHOST_POINTS = [200, 400, 800, 1600]; // por fantasma comido en el mismo efecto
```

Cada fantasma reemplaza la lectura directa de `releaseDelay` por un sello de tiempo (mantiene `releaseDelay` como demora original):

```js
{
  releaseDelay: 0,
  releaseAt: 0, // playTime en el que pasa de 'waiting' a 'leaving'
}
```

`src/js/audio.js` (archivo nuevo) mantiene el estado del audio a nivel de módulo:

```js
let audioCtx = null; // AudioContext, creado en el primer gesto del usuario
let muted = false;

const SOUNDS = {
  dot: { freqs: [440, 330], duration: 0.06, type: "square" }, // waka, alterna por dot
  power: { freq: 220, sweep: 660, duration: 0.3, type: "square" },
  ghost: { freq: 880, duration: 0.15, type: "square" }, // tono fijo
  death: { freq: 500, sweep: 100, duration: 0.8, type: "square" },
};
```

Convenciones:

- `powerTimer` se decrementa `1/60` por fotograma mientras `state === 'playing'`, igual que `playTime`. Al comer un pellet: `powerTimer = POWER_DURATION` y `ghostCombo = 0`.
- `releaseAt` se calcula como `playTime + releaseDelay` al crear la partida, al `resetPositions()` y al comer un fantasma (donde `playTime` es el momento del retorno).
- El tile 4 es transitable para ambos actores: `isWall()` solo bloquea 1 y 3, así que `canMove()` no cambia.
- Solo los fantasmas en modo `active` son comestibles y muestran el color de efecto.
- El fantasma comido conserva su dirección `up` y su celda de `GHOST_STARTS`.
- `playSound( name )` es un global de `audio.js`. Si `muted` es true no hace nada. El `AudioContext` se crea o reanuda dentro de `playSound` (primer gesto de usuario ya ocurrió: el clic en Jugar).
- El waka alterna entre `freqs[0]` y `freqs[1]` en cada dot comido, usando un contador interno del módulo.
- `toggleMute()` invierte `muted` y devuelve el nuevo valor. La tecla `m` en `main.js` lo llama.
- Los sonidos se disparan desde `game.js` en el momento exacto del evento, sin tocar la lógica de estado.

## Implementation plan

1. Añadir `'o' → 4` en `parseTile` de `src/js/maze.js`, reemplazar los cuatro puntos de las esquinas en `MAZE_STR` y documentar el tile 4 en el comentario de cabecera. Prueba manual: el laberinto muestra 4 círculos grandes en las esquinas y todo lo demás igual.
2. Dibujar los tiles `4` en `src/js/render.js` con radio 6 y `DOT_COLOR`. Prueba manual: los pellets se distinguen de los dots a simple vista.
3. En `movePacman()` de `src/js/game.js`, comer tile `4`: `+50` puntos, celda a `0`, `dotsRemaining--`, `powerTimer = POWER_DURATION`, `ghostCombo = 0`. Contar también los tiles 4 en el conteo inicial de `createGame()`. Prueba manual: comer un pellet suma 50, desaparece y comer los cuatro + todos los dots da la victoria.
4. Añadir el decremento de `powerTimer` en `update()` mientras `state === 'playing'`. Prueba manual: el juego sigue corriendo igual sin pellets (timer en 0).
5. Refactorizar la liberación a `releaseAt`: `createGame()` (`releaseAt = releaseDelay`), `releaseGhosts()` (`playTime >= g.releaseAt`) y `resetPositions()` (`releaseAt = releaseDelay` con `playTime = 0`). Prueba manual: la salida escalonada 0/2/4/6 segundos de SPEC 01 sigue intacta.
6. IA asustada en `decideGhost()`: si `powerTimer > 0` y el modo es `active`, elegir dirección al azar entre `choices` en lugar de `chaseDirection()`. Prueba manual: durante el efecto los fantasmas dejan de perseguir y se dispersan.
7. Colisión en `update()`: si `powerTimer > 0` y el fantasma es `active`, comérselo (`GHOST_POINTS[ Math.min( ghostCombo, 3 ) ]`, `ghostCombo++`, fantasma a su celda inicial con `mode: 'waiting'` y `releaseAt = playTime + releaseDelay`) sin restar vidas; si el fantasma no es `active`, la colisión no hace nada. Fuera del efecto, conservar la lógica de vidas actual. Prueba manual: con el efecto activo Pacman no muere y come fantasmas; el fantasma comido vuelve a salir de la pen.
8. En `draw()` de `src/js/render.js`, dibujar cada fantasma `active` con `powerTimer > 0` en el color que corresponda al parpadeo (`Math.floor( frame / 15 ) % 2` alterna `#00ffff` y `#ffffff`); los demás conservan `GHOST_COLORS`. Prueba manual: los 15 segundos muestran cyan parpadeante y al terminar vuelven los colores originales.
9. Crear `src/js/audio.js` con `audioCtx` perezoso, el helper `beep()` (OscillatorNode + envolvente de ganancia), el mapa `SOUNDS`, `playSound( name )` y `toggleMute()`, exportados por `window`. Prueba manual: desde la consola, tras iniciar una partida, `playSound('dot')` emite un tono.
10. Disparar sonidos desde `src/js/game.js`: `playSound('dot')` al comer un dot y `playSound('power')` al comer un pellet en `movePacman()`; `playSound('ghost')` al comer un fantasma y `playSound('death')` al perder una vida en `update()`. Prueba manual: cada evento suena una vez, sin duplicados.
11. Añadir la tecla `m` en el handler `keydown` de `src/js/main.js` que llama a `toggleMute()` antes del lookup de `KEY_DIR`. Prueba manual: M silencia los sonidos y vuelve a activarlos, también fuera de una partida.
12. Cargar `js/audio.js` en `src/index.html` después de `render.js` y antes de `main.js`. Actualizar el comentario de `AGENTS.md` con el nuevo orden de scripts y el tile 4. Prueba manual: el juego carga sin errores y la documentación coincide con el código.

## Acceptance criteria

- [ ] El laberinto muestra exactamente cuatro power pellets: (1,3), (26,3), (1,26) y (26,26).
- [ ] Un power pellet se dibuja más grande que un dot.
- [ ] Comer un power pellet suma 50 puntos y elimina el pellet del laberinto.
- [ ] Al comer un power pellet, los fantasmas activos pasan a cyan parpadeante (alterna cyan/blanco).
- [ ] Durante 15 segundos, los fantasmas activos eligen direcciones aleatorias y no persiguen a Pacman.
- [ ] Chocar con un fantasma activo durante el efecto se lo come en lugar de restar una vida.
- [ ] Dentro de un mismo efecto, comer fantasmas suma 200, luego 400, luego 800 y luego 1600; posteriores siguen dando 1600.
- [ ] Un fantasma comido aparece en su celda de la pen en modo `waiting` y luego sale normalmente.
- [ ] Chocar con un fantasma no activo durante el efecto no mata a Pacman ni suma puntos.
- [ ] Pasados los 15 segundos, los fantasmas recuperan su color original y vuelven a perseguir a Pacman.
- [ ] Comer otro power pellet durante el efecto reinicia el contador a 15 segundos y reinicia la secuencia 200/400/800/1600.
- [ ] Pacman no puede perder vidas mientras el efecto está activo.
- [ ] Fuera del efecto, chocar con un fantasma activo sigue costando una vida.
- [ ] Ganar el nivel exige comer también los cuatro power pellets.
- [ ] La salida escalonada de SPEC 01 (0, 2, 4, 6 segundos) sigue funcionando igual.
- [ ] Comer un dot reproduce el waka y comer un power pellet reproduce su sonido.
- [ ] Comer un fantasma reproduce su sonido con el mismo tono sin importar su posición en la cadena.
- [ ] Perder una vida reproduce el sonido de muerte.
- [ ] Presionar `m` silencia los sonidos y volver a presionarlos los restaura.
- [ ] El juego carga y se juega sin errores en la consola, incluso antes de que exista un AudioContext.

## Decisions

- **Sí:** tile `4` con carácter `'o'` en `MAZE_STR`. Consistente con 0/1/2/3 y `createGame()` lo clona sin lógica nueva.
- **Sí:** los power pellets cuentan en `dotsRemaining`. Coherente con el arcade; si no, se podría ganar el nivel dejando pellets en pantalla.
- **Sí:** parpadeo continuo los 15 s alternando cyan y blanco cada 15 fotogramas. Pidió parpadeo total; el alternado mantiene el fantasma visible.
- **Sí:** dirección aleatoria asustada con las mismas reglas que la persecución (sin invertir salvo callejón). Evita quiebres bruscos y reutiliza la lista `choices` existente.
- **Sí:** fantasma comido espera su `releaseDelay` original contado desde el retorno, mediante el nuevo sello `releaseAt`. Sin esto, `playTime` ya alto haría que el fantasma saliera de la pen de forma instantánea e invisible.
- **Sí:** solo los fantasmas `active` son comestibles y muestran el color de efecto. Evita "farmear" fantasmas bajo la puerta de la pen.
- **Sí:** `ghostCombo` con tope de 1600. En el arcade el quinto fantasma también vale 1600.
- **Sí:** Web Audio API sintetizado con `OscillatorNode`, sin archivos. El repo es estático y sin dependencias; agregar binarios rompería esa característica.
- **Sí:** `audio.js` como archivo nuevo, aislado y cargado antes de `main.js`. Mantiene el dominio de audio separado de lógica y render.
- **Sí:** `AudioContext` creado o reanudado de forma perezosa en `playSound`. Cumple la política de autoplay de los navegadores sin tocar el flujo del juego.
- **Sí:** tecla `m` para silenciar con un booleano simple. Costo mínimo, sin UI nueva.
- **Sí:** waka en los dots alternando dos tonos. Lo pidió el usuario; es parte de la identidad sonora del juego.
- **Sí:** tono fijo al comer fantasma, sin ascender con la cadena. Decidido por el usuario; la escalera 200/400/800/1600 ya comunica la progresión en puntos.
- **No:** archivos de audio externos. Requiere assets binarios en el repo.
- **No:** indicador de sonido en el HUD o control de volumen gradual. Solo la tecla M.
- **No:** sonidos para victoria, derrota final o inicio de nivel. No se pidieron; pueden ir en otro spec.
- **No:** inversión de dirección de todos los fantasmas al activarse el efecto. No se pidió y añade una sacudida difícil de percibir.
- **No:** que Pacman cambie de color o parpadee. Confirmado con el usuario.
- **No:** reducir la velocidad de los fantasmas asustados. Su dispersión aleatoria ya cambia la dinámica.

## Risks

| Riesgo                                                                                      | Mitigación                                                                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Un fantasma comido saldría de la pen de forma instantánea e imperceptible.                  | `releaseAt` mide la demora desde el retorno a la pen, no desde el inicio de la partida.          |
| Una colisión con un fantasma `leaving` en la puerta podría matar a Pacman "invencible".     | La rama de colisión verifica `powerTimer > 0` antes de cualquier resto de vidas.                 |
| El conteo de `dotsRemaining` olvida los pellets y el nivel se gana con pellets en pantalla. | `createGame()` cuenta tiles `2` y `4`; cada pellet comido decrementa el contador una sola vez.   |
| El navegador bloquea el `AudioContext` hasta un gesto del usuario.                          | El contexto se crea o reanuda dentro de `playSound`, siempre después del clic en el botón Jugar. |
| El waka continuo al comer dots puede resultar molesto.                                      | Sonidos de 60 ms con envolvente de ganancia y la tecla `m` para silenciar sin recargar.          |

## What is **not** in this spec

- Archivos de audio externos, samples reales o control de volumen gradual.
- Indicador de sonido en el HUD.
- Sonidos para victoria, derrota final o transiciones de estado.
- Sprites de ojos de fantasma comido, inversión de dirección al activar el efecto o cambios visuales de Pacman.
- Ajuste de duración o dificultad por nivel.
- Modificaciones a controles, vidas, puntuación de dots o geometría del laberinto más allá de los cuatro pellets.

Cada uno de estos temas, si se incorpora, requiere su propia especificación.
