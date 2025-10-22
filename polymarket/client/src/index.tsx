import { render } from 'solid-js/web';
import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Failed to find the root element');
}

render(() => <App />, root);

