import { createPyramidPlayfieldPrototype } from './pyramidPlayfieldPrototype';
import './styles.css';

const root = document.getElementById('root') as HTMLElement;

createPyramidPlayfieldPrototype(root, {
  title: 'Pyramid Playfield',
  subtitle: 'Light, playful, and icy using your custom art assets.'
});
