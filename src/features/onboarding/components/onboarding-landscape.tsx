import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { palette } from '@/theme';
import { type OnboardingSlide } from '../data/onboarding-slides';

type Props = {
  slideId: OnboardingSlide['id'];
};

const scenes = {
  'ONB-SCR-001': {
    mountains: 'M0 188 C67 180 97 278 146 300 C196 323 238 288 271 245 C319 183 355 159 390 155 L390 570 L0 570Z',
    distantHill: 'M0 392 C55 351 95 356 144 375 C197 333 254 339 302 374 C340 355 366 362 390 379 L390 570 L0 570Z',
    frontHill: 'M0 416 C50 393 99 397 149 421 C211 382 272 387 322 416 C351 402 373 408 390 418 L390 570 L0 570Z',
    wave: 'M0 440 C70 417 124 454 191 444 C265 433 320 409 390 433 L390 570 L0 570Z',
    waveFront: 'M0 472 C61 447 113 474 177 469 C256 461 323 438 390 462 L390 570 L0 570Z',
  },
  'ONB-SCR-002': {
    mountains: 'M0 295 C53 261 91 267 143 307 C192 345 245 327 292 284 C337 244 364 230 390 235 L390 570 L0 570Z',
    distantHill: 'M0 382 C36 365 82 363 131 388 C185 352 240 356 291 383 C327 365 361 369 390 388 L390 570 L0 570Z',
    frontHill: 'M0 419 C48 398 89 400 140 424 C192 395 239 392 299 419 C335 402 365 408 390 424 L390 570 L0 570Z',
    wave: 'M0 438 C46 449 92 421 145 436 C206 452 262 446 316 425 C344 414 369 418 390 428 L390 570 L0 570Z',
    waveFront: 'M0 470 C62 454 116 478 177 477 C255 475 314 447 390 460 L390 570 L0 570Z',
  },
  'ONB-SCR-003': {
    mountains: 'M0 147 C47 84 102 50 151 72 C210 87 239 156 288 152 C332 149 354 118 390 124 L390 570 L0 570Z',
    distantHill: 'M0 370 C53 344 99 353 146 380 C189 349 248 343 294 371 C334 349 369 359 390 375 L390 570 L0 570Z',
    frontHill: 'M0 414 C41 394 92 400 140 425 C201 388 258 398 304 419 C337 402 365 405 390 422 L390 570 L0 570Z',
    wave: 'M0 445 C58 420 110 440 168 448 C225 456 281 434 329 419 C355 412 374 420 390 428 L390 570 L0 570Z',
    waveFront: 'M0 473 C58 451 117 472 175 477 C245 483 309 445 390 461 L390 570 L0 570Z',
  },
  'ONB-SCR-004': {
    mountains: 'M0 173 C48 110 96 75 148 110 C194 140 224 211 284 219 C327 227 359 198 390 188 L390 570 L0 570Z',
    distantHill: 'M0 385 C45 357 89 360 138 385 C188 356 237 354 288 380 C329 357 362 369 390 390 L390 570 L0 570Z',
    frontHill: 'M0 418 C51 394 99 399 145 424 C192 398 247 391 298 419 C334 402 368 410 390 425 L390 570 L0 570Z',
    wave: 'M0 438 C50 422 101 426 157 446 C210 464 266 443 320 425 C352 414 374 423 390 436 L390 570 L0 570Z',
    waveFront: 'M0 472 C68 450 116 479 178 478 C255 477 319 448 390 465 L390 570 L0 570Z',
  },
} satisfies Record<OnboardingSlide['id'], {
  mountains: string;
  distantHill: string;
  frontHill: string;
  wave: string;
  waveFront: string;
}>;

function Bush({ x, y, scale, color }: { x: number; y: number; scale: number; color: string }) {
  return (
    <G transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'} fill={color}>
      <Path d="M0 0 C-20 -4 -24 -24 -11 -34 C0 -32 5 -23 3 -12 C9 -30 25 -32 32 -20 C31 -7 18 -1 7 1 C20 -3 33 4 32 16 C19 24 6 15 2 5 C0 22 -12 29 -25 21 C-27 8 -16 0 -5 0Z" />
      <Path d="M1 4 C-2 -5 -2 -14 1 -23" fill="none" stroke={palette.mint[600]} strokeWidth={1.5} opacity={0.6} />
    </G>
  );
}

export function OnboardingLandscape({ slideId }: Props) {
  const scene = scenes[slideId];
  const gradientId = 'onboarding-landscape-' + slideId;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 390 570"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.mint[300]} stopOpacity={0.62} />
          <Stop offset="1" stopColor={palette.mint[100]} stopOpacity={0.82} />
        </LinearGradient>
      </Defs>
      <Path d={scene.mountains} fill={'url(#' + gradientId + ')'} />
      <Path d={scene.distantHill} fill={palette.mint[300]} opacity={0.62} />
      <Path d={scene.frontHill} fill={palette.mint[500]} opacity={0.28} />
      <Bush x={30} y={422} scale={0.75} color={palette.mint[300]} />
      <Bush x={352} y={412} scale={0.84} color={palette.mint[300]} />
      <Path d={scene.wave} fill={palette.teal[50]} opacity={0.68} />
      <Path d={scene.waveFront} fill={palette.mint[100]} opacity={0.92} />
    </Svg>
  );
}
