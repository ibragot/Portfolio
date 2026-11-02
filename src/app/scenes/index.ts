import type { SceneFactory } from "./kit";
import { alley, avenue, bridge, grid } from "./plates";
import { rooftop } from "./rooftop";

export { alley, avenue, bridge, grid, rooftop };
export const SCENES: Record<string, SceneFactory> = { rooftop, avenue, bridge, grid, alley };
