# AI PROJECT

A simple web app that serves a TensorFlow.js model exported from Teachable Machine and hosted from the `public/` folder using a Node.js server.

## Project Structure

- `server.js`: Node.js server entry point.
- `public/`: Static assets served by the server.
  - `index.html`: App UI.
  - `script.js`: Front-end logic.
  - `styles.css`: Styles.
   - `my_model/`: Teachable Machine TensorFlow.js model files.

## Run Locally

1. Install dependencies:
   - `npm install`
2. Start the server:
   - `node server.js`
3. Open the app in your browser at the URL shown in the terminal.

## Teachable Machine Model

This project expects a Teachable Machine image model exported as TensorFlow.js and placed in [public/my_model](public/my_model).
Ensure the model files include `model.json` and `metadata.json`, and that [public/script.js](public/script.js) loads the model from `./my_model/`.
