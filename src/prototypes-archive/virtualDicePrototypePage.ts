import { createVirtualDicePrototype } from './virtualDicePrototype';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing #root container for the virtual dice prototype page.');
}

const prototype = createVirtualDicePrototype(root, {
  title: 'Virtual dice, staged for anticipation.',
  subtitle:
    'This standalone prototype uses the SVG face art to show how the dice can gather, tumble, and settle before the result is revealed.'
});

declare global {
  interface Window {
    virtualDicePrototype?: typeof prototype;
  }
}

window.virtualDicePrototype = prototype;
