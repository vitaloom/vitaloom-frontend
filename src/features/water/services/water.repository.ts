import { MockWaterRepository } from '../mocks/mock-water.repository';
import type { WaterRepository } from '../types/water';

/** Single dependency seam for replacing the in-memory mock with an API adapter. */
export const waterRepository: WaterRepository = new MockWaterRepository();
