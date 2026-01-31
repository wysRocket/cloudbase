
# Project Documentation

## 1. Project Structure
This project is built as a Single Page Application (SPA) using **Vite**.

*   `src/`: Contains all source code.
    *   `main.jsx`: The entry point of the application. It mounts the React root.
    *   `App.jsx`: The main application component containing the logic, animations, and UI.
    *   `input.css`: The main CSS file where Tailwind directives are defined.
*   `index.html`: The HTML shell of your application.
*   `vite.config.js`: Configuration for the Vite build tool.
*   `tailwind.config.js`: Configuration for Tailwind CSS.

## 2. Technology Stack

### Core
*   **React 18+**: The library for web and native user interfaces.
*   **Vite**: Next Generation Frontend Tooling.

### Styling
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.

### Animation
*   **Framer Motion**: A production-ready motion library for React. Used for all scroll animations, text reveals, and UI transitions.

## 3. Customization Guide

### Changing Colors
Colors are managed via Tailwind CSS. You can change the classes in `App.jsx` (e.g., `bg-slate-900` to `bg-black`).

### Animations
Animations are controlled by the `variants` object in Framer Motion components.
*   Look for `<motion.div>` elements.
*   Adjust `initial`, `animate`, and `whileInView` props to change timing and easing.

## 4. Deployment
To deploy this project to production:
1.  Run `npm run build`.
2.  The output will be in the `dist/` folder.
3.  Upload the contents of `dist/` to any static host (Vercel, Netlify, GitHub Pages, AWS S3).
