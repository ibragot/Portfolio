# noureldin.dev

Personal portfolio of Noureldin Ibrahim: a scroll-down descent through a painted city at night, from the moon above the spires to one lamp in an alley.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things live

- `src/app/content.ts`: all the text (projects, experience, skills, contact). Edit this to update the site.
- `src/app/NoirCity.tsx`: the page sections, elevator floor dial and project windows.
- `src/app/scenes/plate.ts` and `src/app/Scene.tsx`: bring the paintings to life (parallax layers, lit windows, lightning, fog, rain, steam, the alley lamp).
- `src/app/scenes/index.ts`: the settings for each painted scene.
- `public/art/`: the paintings, upscaled and split into back and front layers, plus window masks.
- `src/app/Radio.tsx` and `src/app/audio.ts`: the radio with city ambience, tuning static and sound effects.

## Credits

City illustrations are used with the artist's permission.
Rain, thunder, street and bar recordings come from the open-source [Moodist](https://github.com/remvze/moodist) sound library
(CC0 and Pixabay Content License), mixed into seamless loops for this site.
Fonts: Big Shoulders Display and Fraunces, both under the SIL Open Font License.
