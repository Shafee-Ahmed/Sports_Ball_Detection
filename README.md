# AI PROJECT

A simple web app that serves a TensorFlow.js model from the `public/` folder using a Node.js server.

## Project Structure

- `server.js`: Node.js server entry point.
- `public/`: Static assets served by the server.
  - `index.html`: App UI.
  - `script.js`: Front-end logic.
  - `styles.css`: Styles.
  - `my_model/`: TensorFlow.js model files.

## Run Locally

1. Install dependencies:
   - `npm install`
2. Start the server:
   - `node server.js`
3. Open the app in your browser at the URL shown in the terminal.
