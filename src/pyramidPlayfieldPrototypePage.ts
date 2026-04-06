import { createPyramidPlayfieldPrototype } from './pyramidPlayfieldPrototype.ts';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root container for the pyramid playfield prototype page.');
}

const prototype = createPyramidPlayfieldPrototype(root, {
  title: 'Pyramid rack layout',
  subtitle:
    'This experiment uses the SVG backgrounds, button frames, and pyramid art to reconstruct the tabletop structure with the smaller pieces closest to the player.'
});

declare global {
  interface Window {
    pyramidPlayfieldPrototype?: typeof prototype;
  }
}

window.pyramidPlayfieldPrototype = prototype;
