# SPEC 02 — Controles de movimiento con AWSD

> **Status:** Approved
> **Depends on:** Ninguna
> **Date:** 2026-10-28
> **Objective:** Reemplazar el movimiento de Pacman basado en las flechas del teclado por las teclas A, W, S y D.

## Scope

**In:**

- Reemplazar las cuatro teclas de flecha por `a`, `w`, `s` y `d` en el mapa `KEY_DIR` de `src/js/main.js`.
- Normalizar la tecla recibida a minúsculas con `e.key.toLowerCase()` antes del mapa, para que AWSD funcione con Shift o Caps Lock activados.
- Actualizar la línea de ayuda de `src/index.html` para mencionar AWSD en lugar de las flechas.

**Out of scope (for future specs):**

- Mantener las flechas como esquema alternativo junto a AWSD.
- Teclas para iniciar o reiniciar la partida (Espacio o Enter).
- Controles táctiles, gamepad o soporte para distribuciones AZERTY.

## Data model

`src/js/main.js` conserva el mismo mapa `KEY_DIR`, ahora con letras en lugar de flechas:

```js
const KEY_DIR = {
  a: "left",
  d: "right",
  w: "up",
  s: "down",
};
```

El handler `keydown` hará el lookup con `KEY_DIR[ e.key.toLowerCase() ]`. Con Caps o Shift, `e.key` llega como `'W'` y la normalización lo convierte en `'w'`.

Convenciones:

- Las claves del mapa son minúsculas y coinciden con `e.key` ya normalizado.
- El resto del juego sigue recibiendo solo valores `'left' | 'right' | 'up' | 'down'`; `game.pacman.nextDir` no cambia.

## Implementation plan

1. Cambiar las cuatro entradas de `KEY_DIR` en `src/js/main.js` por `a`, `d`, `w`, `s`. Prueba manual: durante una partida, AWSD mueve a Pacman en la dirección correspondiente.
2. Normalizar la tecla en el handler `keydown` con `e.key.toLowerCase()`. Prueba manual: con Shift o Caps Lock activados, AWSD sigue moviendo a Pacman.
3. Actualizar la ayuda de `src/index.html` a "Usa A, W, S, D para moverte. Come todos los puntos." Prueba manual: el texto visible menciona AWSD.

## Acceptance criteria

- [ ] Presionar `a` mueve a Pacman a la izquierda.
- [ ] Presionar `w` lo mueve hacia arriba.
- [ ] Presionar `s` lo mueve hacia abajo.
- [ ] Presionar `d` lo mueve a la derecha.
- [ ] AWSD funciona con Shift o Caps Lock activados.
- [ ] Las flechas ya no mueven a Pacman.
- [ ] El texto de ayuda de `src/index.html` menciona A, W, S, D.
- [ ] El juego carga y se juega sin errores en la consola.

## Decisions

- **Sí:** reemplazo total de flechas por AWSD. El usuario pidió reemplazar; un solo esquema mantiene el código simple.
- **Sí:** normalizar con `e.key.toLowerCase()`. Cubre Shift y Caps Lock casi sin costo.
- **Sí:** actualizar el texto de ayuda. Un texto que dice "Flechas" con controles AWSD engaña al jugador.
- **No:** mantener flechas en paralelo. Decidido en la fase de preguntas; puede reabrirse en otro spec si se necesita.
- **No:** teclas Espacio o Enter para iniciar la partida. Fuera de alcance; el inicio sigue siendo con el botón.
- **No:** usar `e.code` en lugar de `e.key`. Cambiaría el comportamiento ante otros layouts de teclado y no se pidió.

## What is **not** in this spec

- Flechas como esquema alternativo de movimiento.
- Teclas Espacio o Enter para iniciar o reiniciar la partida.
- Controles táctiles o gamepad.
- Adaptación a distribuciones de teclado AZERTY.

Cada uno de estos temas, si se incorpora, requiere su propia especificación.
