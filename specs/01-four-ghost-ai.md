# SPEC 01 — Cuatro fantasmas con IA clásica

> **Status:** Approved
> **Depends on:** Ninguna
> **Date:** 2026-10-28
> **Objective:** Añadir cuatro fantasmas con personalidades clásicas, salida escalonada desde la pen y reinicio completo al perder una vida.

## Scope

**In:**

- Reemplazar los dos fantasmas actuales por cuatro fantasmas con identidades `blinky`, `pinky`, `inky` y `clyde`.
- Ubicar a los cuatro fantasmas en celdas distintas de la pen al crear una partida y al reiniciar posiciones.
- Añadir los estados de salida `waiting`, `leaving` y `active` para cada fantasma.
- Liberar a los fantasmas a los 0, 2, 4 y 6 segundos desde el inicio de la partida o desde el reinicio tras perder una vida.
- Mantener inmóvil a un fantasma en `waiting`.
- Guiar a un fantasma en `leaving` a través de una puerta de la pen antes de aplicar su IA normal.
- Aplicar una personalidad de movimiento distinta en cada intersección a los cuatro fantasmas activos.
- Mantener la velocidad de `0.1` celdas por fotograma para todos los fantasmas.
- Mostrar los fantasmas en este orden e identidad visual: Blinky rojo, Pinky rosa, Inky cian y Clyde naranja.

**Out of scope (for future specs):**

- Píldoras de poder, fantasmas asustados o fantasmas comestibles.
- Alternancia global entre modos de persecución y dispersión.
- Reproducción de errores, prioridades de giro o temporizadores exactos del Pac-Man original.
- Cambios en el tamaño, geometría o sistema de dots del laberinto.
- Persistencia de la partida o de estadísticas de los fantasmas.

## Data model

`src/js/maze.js` definirá las cuatro posiciones iniciales dentro de la pen:

```js
const GHOST_STARTS = [
  { x: 12, y: 14, kind: "blinky", releaseDelay: 0 },
  { x: 13, y: 14, kind: "pinky", releaseDelay: 2 },
  { x: 14, y: 14, kind: "inky", releaseDelay: 4 },
  { x: 15, y: 14, kind: "clyde", releaseDelay: 6 },
];
```

Cada elemento de `game.ghosts` en `src/js/game.js` conservará `x`, `y`, `dir`, `speed` y `kind`, y añadirá:

```js
{
  releaseDelay: 0,
  mode: 'waiting', // 'waiting' | 'leaving' | 'active'
}
```

El estado de partida añadirá un contador de tiempo de juego en segundos para determinar cuándo un fantasma pasa de `waiting` a `leaving`.

Convenciones:

- Las coordenadas de celda usan origen en la esquina superior izquierda.
- Las demoras se miden desde que `game.state` pasa a `playing`.
- Cada reinicio de posiciones restablece el contador de tiempo y los modos de los cuatro fantasmas.
- Los objetivos de IA son coordenadas de celda y se comparan con distancia Manhattan al elegir una dirección.

## Implementation plan

1. Ampliar `GHOST_STARTS` en `src/js/maze.js` con las cuatro posiciones, identidades y demoras de liberación. Prueba manual: al iniciar la partida existen cuatro objetos de fantasma con configuraciones distintas.
2. Crear en `src/js/game.js` el contador de tiempo de la partida y copiar `releaseDelay` y `mode: 'waiting'` a cada fantasma al crear una partida. Prueba manual: el juego carga y conserva cuatro fantasmas inmóviles en la pen antes de sus respectivas demoras.
3. Actualizar `resetPositions()` para restaurar las cuatro coordenadas iniciales, sus direcciones, sus modos `waiting` y el contador de tiempo. Prueba manual: al perder una vida, los cuatro regresan a la pen y las demoras vuelven a comenzar.
4. Implementar el cambio de `waiting` a `leaving` cuando el contador alcance `releaseDelay`. Prueba manual: los fantasmas se activan en el orden 0, 2, 4 y 6 segundos.
5. Implementar el movimiento guiado del modo `leaving` hacia la puerta de la pen y cambiar a `active` solo después de cruzarla. Prueba manual: ningún fantasma deambula dentro de la pen ni aplica su IA normal antes de salir.
6. Separar en funciones de objetivo la IA de Blinky y Pinky. Blinky debe apuntar a la celda actual de Pacman y Pinky a la celda cuatro posiciones delante de su dirección. Prueba manual: en una intersección, ambos eligen rutas diferentes cuando Pacman avanza con espacio delante.
7. Añadir la IA de Inky y Clyde. Inky debe usar el vector desde Blinky hacia la celda dos posiciones delante de Pacman y duplicarlo; Clyde debe perseguir a Pacman cuando está a más de ocho celdas Manhattan y apuntar a la esquina inferior izquierda en otro caso. Prueba manual: ambos cambian de ruta según Blinky o la distancia a Pacman.
8. Aplicar la selección de dirección basada en el objetivo solo a fantasmas `active`, conservando la prohibición de invertir dirección salvo en callejones. Prueba manual: los cuatro se mueven por pasillos válidos y siguen atravesando el túnel.
9. Reordenar `GHOST_COLORS` en `src/js/render.js` para que el índice de cada inicio corresponda a rojo, rosa, cian y naranja. Prueba manual: los cuatro fantasmas se dibujan con su identidad visual acordada.

## Acceptance criteria

- [ ] Una partida nueva contiene exactamente cuatro fantasmas.
- [ ] Los cuatro fantasmas comienzan en cuatro celdas distintas de la pen.
- [ ] Blinky es rojo, Pinky es rosa, Inky es cian y Clyde es naranja.
- [ ] Al empezar una partida, los fantasmas salen de la pen a los 0, 2, 4 y 6 segundos respectivamente.
- [ ] Un fantasma que espera permanece inmóvil hasta su demora de salida.
- [ ] Un fantasma atraviesa la puerta de la pen antes de aplicar su personalidad de persecución.
- [ ] Blinky elige en intersecciones la dirección válida que reduce la distancia Manhattan hacia Pacman.
- [ ] Pinky elige en intersecciones la dirección válida que reduce la distancia Manhattan hacia la celda cuatro posiciones delante de Pacman.
- [ ] Inky elige en intersecciones la dirección válida que reduce la distancia Manhattan hacia su objetivo calculado con Pacman y Blinky.
- [ ] Clyde persigue a Pacman si está a más de ocho celdas Manhattan y, en caso contrario, se dirige hacia la esquina inferior izquierda.
- [ ] Ningún fantasma invierte su dirección en una intersección salvo cuando está en un callejón sin otra salida válida.
- [ ] Al perder una vida, los cuatro fantasmas vuelven a sus posiciones iniciales y reinician el calendario de 0, 2, 4 y 6 segundos.
- [ ] El juego se carga sin errores en la consola y mantiene el túnel funcional para los fantasmas.

## Decisions

- **Sí:** usar cuatro personalidades clásicas simplificadas. Diferencia los patrones de persecución sin reproducir peculiaridades del arcade original.
- **Sí:** Blinky será el perseguidor agresivo y apuntará directamente a Pacman. Cumple el requisito de un fantasma con persecución directa.
- **Sí:** usar una salida escalonada de 0, 2, 4 y 6 segundos. Evita que cuatro perseguidores presionen a Pacman desde el primer instante.
- **Sí:** modelar explícitamente `waiting`, `leaving` y `active`. Impide que la IA normal produzca movimiento errático dentro de la pen.
- **Sí:** reiniciar posiciones, estados y demoras tras perder una vida. Cada vida comienza bajo las mismas condiciones.
- **No:** aumentar la velocidad del perseguidor agresivo. Todos conservan `0.1` celdas por fotograma para aislar la dificultad a las decisiones de ruta.
- **No:** añadir modos asustado, dispersión o píldoras de poder. Requieren reglas, sprites y puntuación que pertenecen a otra especificación.
- **No:** añadir una interfaz de depuración. La validación será mediante observación manual del juego.

## Risks

| Risk                                                                            | Mitigation                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Un fantasma puede quedarse atrapado en la pen al perseguir un objetivo externo. | El modo `leaving` usa un objetivo de salida separado y no activa la IA normal hasta cruzar la puerta.             |
| Las coordenadas calculadas delante de Pacman pueden quedar fuera del laberinto. | La elección de dirección evalúa solo las celdas transitables inmediatamente adyacentes.                           |
| Inky depende de la posición de Blinky antes de que ambos hayan salido.          | Inky se mantiene en `waiting` o `leaving` hasta que corresponda su salida y calcula su objetivo solo en `active`. |
| Cuatro fantasmas incrementan las colisiones percibidas en pasillos estrechos.   | Se conserva la detección de colisión actual y la velocidad común para evitar cambios adicionales de dificultad.   |

## What is **not** in this spec

- Píldoras de poder, modo asustado y captura de fantasmas.
- Ciclos de persecución y dispersión cronometrados.
- IA idéntica al arcade original, incluidas sus peculiaridades de giro.
- Modificaciones al laberinto, puntuación, vidas o controles.

Cada uno de estos temas, si se incorpora, requiere su propia especificación.
