# noureldin.dev

Personal portfolio of Noureldin Ibrahim: a scroll-down descent through a painted art-deco city at night.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things live

- `src/app/content.ts`: all the text (projects, experience, skills, contact). Edit this to update the site.
- `src/app/NoirCity.tsx`: the sections, the elevator floor dial, the project tower walk and the other interactions.
- `src/app/CityCanvas.tsx`: the city behind the page (sky, towers, searchlights, rain, lightning, cursor-lit windows).
- `src/app/Radio.tsx` and `src/app/audio.ts`: the radio with city ambience, tuning static and sound effects.
- `public/audio/`: the four station loops and the tuning static.

## Credits

Rain, thunder, street and bar recordings come from the open-source [Moodist](https://github.com/remvze/moodist) sound library
(CC0 and Pixabay Content License), mixed into seamless loops for this site.
Fonts: Big Shoulders Display and Fraunces, both under the SIL Open Font License.
