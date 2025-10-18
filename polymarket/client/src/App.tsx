import { createSignal, onMount } from 'solid-js';

function App() {
  const [message, setMessage] = createSignal('Welcome to the T2R4 application');

  onMount(() => {
    // Component mounted
    console.log('T2R4 Client loaded');
  });

  return (
    <div class="container-fluid">
      <header class="my-4">
        <h1 class="display-4">T2R4 Client</h1>
        <p class="lead">{message()}</p>
        <button
          class="btn btn-primary"
          onClick={() => setMessage('Built with SolidJS, Bootstrap, and Vite!')}
        >
          Click me
        </button>
      </header>

      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Tech Stack</h5>
              <ul class="list-group list-group-flush">
                <li class="list-group-item">✅ SolidJS - Reactive Framework</li>
                <li class="list-group-item">✅ Bootstrap - Styling</li>
                <li class="list-group-item">✅ Vite - Build Tool</li>
                <li class="list-group-item">✅ TypeScript - Type Safety</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Features</h5>
              <p class="card-text">
                This client application demonstrates the T2R4 tech stack with:
              </p>
              <ul>
                <li>Reactive UI with SolidJS</li>
                <li>Responsive design with Bootstrap</li>
                <li>Fast development with Vite</li>
                <li>Type-safe development</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
