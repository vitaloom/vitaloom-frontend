import { ApiWaterRepository } from './api-water.repository';
import type { WaterRepository } from '../types/water';

/** Authenticated API-backed repository shared by the Water screens. */
export const waterRepository: WaterRepository = new ApiWaterRepository();
