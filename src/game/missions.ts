import type { MissionDef } from './types';

export const STORY_MISSIONS: MissionDef[] = [
  {
    id: 'm1_kathmandu_arrival',
    chapter: 1,
    title: 'Chapter 1: Valley Signals',
    type: 'story',
    region: 'kathmandu',
    briefing:
      'Maya Thapa is waiting near Aarya Durbar Pagoda with encrypted telemetry drives. Grab your Kora GT and meet her at the plaza, then inspect the Thamel Customs Garage.',
    rewardMoney: 1500,
    rewardXp: 150,
    checkpoints: [
      {
        x: 6,
        z: 14,
        radius: 6,
        label: 'Meet Maya Thapa at Aarya Durbar Plaza',
        dialogue: {
          speaker: 'Maya Thapa',
          line: 'Aarya, good timing. A Syndicate convoy rerouted medical drones over Pokhara. Head to Thamel Customs Garage and prep a fast ride.',
        },
      },
      {
        x: -54,
        z: 42,
        radius: 7,
        label: 'Check in at Thamel Customs & Garage',
        dialogue: {
          speaker: 'Bikram (Chief Mechanic)',
          line: 'Your Kora GT is fueled and tuned. You can customize paint or swap rides here anytime.',
        },
      },
    ],
  },
  {
    id: 'm2_pokhara_courier',
    chapter: 2,
    title: 'Chapter 2: Lakeside Medical Run',
    type: 'delivery',
    region: 'pokhara',
    briefing:
      'Pick up emergency cold-chain canisters at Bir Valley Teaching Hospital and deliver them west across the valley to Pokhara Phewa Lakeside before the timer expires.',
    rewardMoney: 3200,
    rewardXp: 300,
    checkpoints: [
      {
        x: 58,
        z: 48,
        radius: 7,
        label: 'Load medical canisters at Bir Valley Hospital',
        dialogue: {
          speaker: 'Dr. Sita Gurung',
          line: 'Canisters secured! Drive west down the Pokhara highway—do not let those batteries overheat.',
        },
      },
      {
        x: -165,
        z: -32,
        radius: 8,
        label: 'Deliver canisters to Pokhara Lakeside Clinic',
        timeLimitSec: 95,
        dialogue: {
          speaker: 'Lakeside Medic',
          line: 'Right on schedule. Pokhara clinic is back online—transferring your courier payout.',
        },
      },
    ],
  },
  {
    id: 'm3_terai_intercept',
    chapter: 3,
    title: 'Chapter 3: Terai Highway Intercept',
    type: 'chase',
    region: 'terai',
    briefing:
      'Syndicate enforcers hijacked a relief convoy on the southern Terai Ring Highway. Head to the Terai Bus Terminal, neutralize their outpost guards, and secure the cargo.',
    rewardMoney: 5000,
    rewardXp: 450,
    checkpoints: [
      {
        x: 0,
        z: 162,
        radius: 8,
        label: 'Intercept Syndicate scouts at Terai Ring Road',
        enemiesCount: 3,
        dialogue: {
          speaker: 'Maya Thapa (Radio)',
          line: 'Hostiles spotted ahead near the Terai terminal! Take cover and clear the roadblock.',
        },
      },
      {
        x: 34,
        z: 185,
        radius: 7,
        label: 'Secure the Terai Relief Convoy',
        dialogue: {
          speaker: 'Convoy Captain',
          line: 'Highway is clear! Returning relief cargo to Kathmandu dispatch.',
        },
      },
    ],
  },
  {
    id: 'm4_monsoon_escape',
    chapter: 4,
    title: 'Chapter 4: Monsoon Pursuit',
    type: 'story',
    region: 'kathmandu',
    briefing:
      'Corrupt dispatchers flagged your plates at Metro Police HQ. Drive near Police HQ to trigger the trace, shake the pursuit, and reach Tribhuvan Skyport Runway.',
    rewardMoney: 6500,
    rewardXp: 600,
    checkpoints: [
      {
        x: 56,
        z: -42,
        radius: 8,
        label: 'Upload trace decoy outside Metro Police HQ',
        dialogue: {
          speaker: 'Aarya',
          line: 'Decoy uploaded—sirens are hot! Time to lose them on the ring road.',
        },
      },
      {
        x: 138,
        z: 10,
        radius: 9,
        label: 'Escape to Tribhuvan Skyport Runway',
        timeLimitSec: 90,
        dialogue: {
          speaker: 'Maya Thapa',
          line: 'You cleared the blockades. A rescue chopper is prepped on the apron for the mountain run.',
        },
      },
    ],
  },
  {
    id: 'm5_himalayan_rescue',
    chapter: 5,
    title: 'Chapter 5: Annapurna Ridge Rescue',
    type: 'rescue',
    region: 'himalaya',
    briefing:
      'A blizzard cut communications at Annapurna Ridge Base Camp in the northern Himalayas. Ascend via the mountain switchbacks in a 4x4 Jeep or fly the Rescue Helicopter.',
    rewardMoney: 9500,
    rewardXp: 900,
    checkpoints: [
      {
        x: -10,
        z: -135,
        radius: 8,
        label: 'Cross the Himalayan Gorge Suspension Bridge',
        dialogue: {
          speaker: 'Base Camp Radio',
          line: 'We hear your engine echo through the canyon! Keep climbing toward the snowline.',
        },
      },
      {
        x: -10,
        z: -215,
        radius: 9,
        label: 'Reach Annapurna Ridge Base Camp',
        timeLimitSec: 120,
        dialogue: {
          speaker: 'Mountaineer Lead',
          line: 'Incredible driving! You brought Aarya City together from the Terai to the peaks.',
        },
      },
    ],
  },
  {
    id: 'side_race_ringroad',
    chapter: 0,
    title: 'Side Gig: Kathmandu Ring Time Trial',
    type: 'race',
    region: 'kathmandu',
    briefing: 'Complete a high-speed 3-checkpoint sprint around Kathmandu Inner Ring Road within 70 seconds.',
    rewardMoney: 2500,
    rewardXp: 220,
    checkpoints: [
      { x: 64, z: 0, radius: 7, label: 'East Gate Checkpoint' },
      { x: 0, z: -64, radius: 7, label: 'North Boulevard Checkpoint', timeLimitSec: 70 },
      { x: -64, z: 0, radius: 7, label: 'West Ring Finish Line', timeLimitSec: 70 },
    ],
  },
  {
    id: 'side_taxi_durbar',
    chapter: 0,
    title: 'Side Gig: Tourist Express Shuttle',
    type: 'delivery',
    region: 'pokhara',
    briefing: 'Shuttle mountain trekkers from Aarya Durbar Plaza straight to the Phewa Boat Dock.',
    rewardMoney: 1800,
    rewardXp: 160,
    checkpoints: [
      { x: 18, z: 10, radius: 6, label: 'Pick up passengers near Durbar Plaza' },
      { x: -175, z: -35, radius: 8, label: 'Drop off at Phewa Mirror Lake Dock', timeLimitSec: 85 },
    ],
  },
];
