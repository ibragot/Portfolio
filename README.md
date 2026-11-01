# noureldin.dev

Personal portfolio of Noureldin Ibrahim, styled as an underwater game pause menu.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things live

- `src/app/content.ts`: all the text (projects, experience, skills, contact). Edit this to update the site.
- `src/app/PauseMenu.tsx`: the menu, panels, keyboard controls and transitions.
- `src/app/OceanCanvas.tsx`: the animated water background (WebGL shader).
- `src/app/Bubbles.tsx`: rising bubbles and click bursts.
- `src/app/Walkman.tsx` and `src/app/audio.ts`: the ocean ambience player and the menu sound effects.
- `public/audio/`: the four ambience loops. `public/images/walkman.webp`: the player photo.

## Credits

Ocean recordings come from the open-source [Moodist](https://github.com/remvze/moodist) sound library
(CC0 and Pixabay Content License), mixed into seamless loops for this site.
Fonts: Archivo and VT323, both under the SIL Open Font License.
