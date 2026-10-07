/* MigaBuilder Physics Map data.
 * Planet figures follow the NASA Planetary Fact Sheets (rounded); black-hole masses and
 * distances follow the published measurements named in each entry; timeline dates use the
 * Planck 2018 age of the universe (13.8 billion years). Numbers are rounded for learning.
 */
(function () {
  'use strict';
  // id, name, icon, kind, colour, mass (kg), diameter (km), surface gravity (m/s²), escape velocity (km/s),
  // length of day (hours, solar day), distance from the Sun (million km; Moon: from Earth), orbital period (Earth days),
  // mean temperature (°C), known moons, rings, atmosphere, about, did-you-know, mean longitude on 1 Jan 2000 (degrees)
  window.PHYS_BODIES = [
    ['sun', 'Sun', '☀️', 'star', '#f5b642', 1.989e30, 1392700, 274, 617.7, 609.1, 0, 0, 5500, 0, false,
      'Hydrogen 73%, helium 25% (it is all plasma)',
      'A middle-aged yellow dwarf star, 4.6 billion years old. In its core, at about 15 million °C, it fuses 600 million tonnes of hydrogen into helium every second. It holds 99.86% of all the mass in the Solar System.',
      'Light leaves the Sun’s surface and reaches Earth in 8 minutes 20 seconds — but the energy took tens of thousands of years to work its way out from the core.', null],
    ['mercury', 'Mercury', '☿️', 'planet', '#a9a29a', 3.30e23, 4879, 3.7, 4.3, 4222.6, 57.9, 88.0, 167, 0, false,
      'Almost none — a very thin exosphere of oxygen, sodium and hydrogen',
      'The smallest planet and the closest to the Sun. With no air to hold heat, its days reach 430 °C and its nights fall to −180 °C.',
      'One day on Mercury (sunrise to sunrise) lasts 176 Earth days — two of its years.', 252.25],
    ['venus', 'Venus', '♀️', 'planet', '#e3c27a', 4.87e24, 12104, 8.9, 10.4, 2802, 108.2, 224.7, 464, 0, false,
      'Carbon dioxide 96.5%, nitrogen 3.5%, clouds of sulfuric acid — 92 times Earth’s air pressure',
      'Almost Earth’s twin in size, but a runaway greenhouse effect makes it the hottest planet, hot enough to melt lead.',
      'Venus spins backwards and so slowly that its day is longer than its year.', 181.98],
    ['earth', 'Earth', '🌍', 'planet', '#4f8fd6', 5.97e24, 12756, 9.8, 11.2, 24, 149.6, 365.25, 15, 1, false,
      'Nitrogen 78%, oxygen 21%, argon 0.9%, carbon dioxide 0.04%',
      'The only place we know with life and liquid water on the surface. Its molten iron core makes a magnetic field that shields us from the solar wind.',
      'Earth is not perfectly round: spinning makes it bulge, so the equator is 43 km wider than the pole-to-pole distance.', 100.46],
    ['moon', 'Moon', '🌙', 'moon', '#c9c6bf', 7.35e22, 3475, 1.6, 2.4, 708.7, 0.384, 27.3, -20, 0, false,
      'Almost none',
      'Earth’s only natural satellite, probably formed when a Mars-sized body (Theia) hit the young Earth 4.5 billion years ago. Its gravity makes most of our ocean tides.',
      'The Moon drifts 3.8 cm farther from Earth every year — measured with lasers bounced off mirrors left by Apollo astronauts.', null],
    ['mars', 'Mars', '♂️', 'planet', '#d0643e', 6.42e23, 6792, 3.7, 5.0, 24.7, 228.0, 687.0, -65, 2, false,
      'Carbon dioxide 95%, nitrogen 2.8%, argon 2% — under 1% of Earth’s pressure',
      'The red planet: its dust is rich in iron oxide (rust). It has the tallest volcano in the Solar System, Olympus Mons, and dried-up river valleys from a wetter past.',
      'Olympus Mons is about 22 km high — roughly two and a half times the height of Mount Everest.', 355.45],
    ['jupiter', 'Jupiter', '♃', 'planet', '#d8a46a', 1.898e27, 142984, 23.1, 59.5, 9.9, 778.5, 4331, -110, 95, true,
      'Hydrogen 90%, helium 10%',
      'The giant: more than twice the mass of all the other planets together. It has no solid surface and the Great Red Spot, a storm wider than Earth that has raged for centuries.',
      'Jupiter spins so fast — a day lasts under 10 hours — that it is visibly flattened at the poles.', 34.40],
    ['saturn', 'Saturn', '♄', 'planet', '#e6cf8f', 5.68e26, 120536, 9.0, 35.5, 10.7, 1432.0, 10747, -140, 274, true,
      'Hydrogen 96%, helium 3%',
      'Famous for its bright rings of ice and rock, hundreds of thousands of km wide but mostly only about 10 metres thick. It has the most known moons of any planet.',
      'Saturn is less dense than water — in a big enough bathtub it would float.', 49.94],
    ['uranus', 'Uranus', '⛢', 'planet', '#8fd3dc', 8.68e25, 51118, 8.7, 21.3, 17.2, 2867.0, 30589, -195, 28, true,
      'Hydrogen 83%, helium 15%, methane 2% (the methane makes it blue-green)',
      'An ice giant that rolls around the Sun on its side — its axis is tilted 98°, probably after a giant collision.',
      'Because of its tilt, each pole gets about 42 years of sunlight followed by 42 years of darkness.', 313.23],
    ['neptune', 'Neptune', '♆', 'planet', '#4f6fd6', 1.02e26, 49528, 11.0, 23.5, 16.1, 4515.0, 59800, -200, 16, true,
      'Hydrogen 80%, helium 19%, methane 1.5%',
      'The farthest planet, found in 1846 by mathematics before anyone saw it: astronomers calculated where it must be from wobbles in Uranus’s orbit. It has the fastest winds in the Solar System, over 2,000 km/h.',
      'Neptune takes 165 years to orbit the Sun — it completed its first orbit since its discovery in 2011.', 304.88],
    ['pluto', 'Pluto', '♇', 'dwarf', '#c8a98c', 1.30e22, 2376, 0.6, 1.2, 153.3, 5906.4, 90560, -225, 5, false,
      'Thin nitrogen, methane and carbon monoxide, which freezes onto the ground when Pluto is far from the Sun',
      'A dwarf planet in the Kuiper Belt, reclassified from planet in 2006. New Horizons flew past in 2015 and found a heart-shaped plain of nitrogen ice.',
      'Pluto is smaller than Earth’s Moon, and its largest moon, Charon, is half its size — they orbit a point in the space between them.', 238.93]
  ];

  // [id, title, seconds after the Big Bang (or null), years ago (null = future), group, text, years from now (future only)]
  window.PHYS_TIMELINE = [
    ['planck', 'Planck era', 1e-43, null, 'early', 'The first 10⁻⁴³ seconds. The universe is so hot and dense that today’s physics breaks down: we would need a theory of quantum gravity to describe it.'],
    ['inflation', 'Cosmic inflation', 1e-36, null, 'early', 'In a tiny fraction of a second, space may have expanded by a factor of at least 10²⁶. Inflation would explain why the universe looks so smooth and flat; the tiny ripples it stretched became the seeds of galaxies.'],
    ['electroweak', 'Forces split and particles get mass', 1e-12, null, 'early', 'The electromagnetic and weak forces separate and the Higgs field switches on, giving particles such as electrons their mass.'],
    ['quarks', 'Protons and neutrons form', 1e-6, null, 'early', 'The soup of quarks cools enough for quarks to bind in threes into protons and neutrons.'],
    ['bbn', 'The first nuclei (nucleosynthesis)', 180, null, 'early', 'Between about 3 and 20 minutes, protons and neutrons fuse into nuclei: about 75% hydrogen and 25% helium by mass, with a trace of lithium. This mix is exactly what we still measure in the oldest gas.'],
    ['matter', 'Matter takes over from light', 1.5e12, null, 'early', 'After about 47,000 years matter, not radiation, makes up most of the energy in the universe, so clumps of matter can start to grow.'],
    ['cmb', 'The first atoms — the oldest light', 1.2e13, null, 'early', 'At 380,000 years the universe cools to about 3,000 °C, electrons join nuclei to form atoms and light can travel freely. That light is still arriving as the cosmic microwave background, cooled to −270 °C.'],
    ['dark', 'The cosmic dark ages', 3e14, null, 'stars', 'No stars shine yet. Dark matter pulls gas into clumps that slowly grow denser.'],
    ['firststars', 'The first stars', 3.2e15, null, 'stars', 'After about 100–200 million years the first stars ignite: huge, short-lived stars of pure hydrogen and helium. When they explode they forge the first heavier elements such as carbon and oxygen.'],
    ['galaxies', 'The first galaxies', 9.5e15, null, 'stars', 'The James Webb Space Telescope has seen bright galaxies from less than 300 million years after the Big Bang — earlier than many expected.'],
    ['reion', 'The universe lights up', 3.2e16, null, 'stars', 'By about 1 billion years, ultraviolet light from stars and galaxies has stripped electrons off the gas between galaxies (reionisation).'],
    ['milkyway', 'The Milky Way takes shape', 4e16, null, 'stars', 'Our galaxy’s oldest stars are about 13 billion years old; its disc formed and grew by swallowing smaller galaxies.'],
    ['noon', 'Cosmic noon', 1.1e17, null, 'stars', 'About 10 billion years ago the universe forms stars fastest — about ten times faster than today — and quasars burn brightest.'],
    ['darkenergy', 'Dark energy takes over', 2.75e17, 5e9, 'stars', 'About 5 billion years ago the expansion of the universe stops slowing down and starts to speed up, driven by dark energy.'],
    ['sun', 'The Sun and planets form', 2.9e17, 4.6e9, 'solar', 'A cloud of gas and dust, enriched by earlier exploded stars, collapses. Most of it becomes the Sun; a flat disc around it becomes the planets.'],
    ['earth', 'Earth and the Moon form', 2.92e17, 4.54e9, 'solar', 'Earth forms from colliding rocks; soon after, a Mars-sized body hits it and the debris forms the Moon.'],
    ['life', 'The first life', 3.1e17, 3.8e9, 'life', 'The oldest evidence of life on Earth — single cells — is about 3.5 to 3.8 billion years old.'],
    ['oxygen', 'Oxygen fills the air', 3.65e17, 2.4e9, 'life', 'Cyanobacteria release oxygen through photosynthesis: the Great Oxidation Event changes Earth’s air for ever.'],
    ['cambrian', 'Animals explode in variety', 4.18e17, 5.4e8, 'life', 'In the Cambrian explosion most major animal groups appear within a few tens of millions of years.'],
    ['dinosaurs', 'Dinosaurs die out', 4.333e17, 6.6e7, 'life', 'A 10 km asteroid hits Mexico’s Yucatán peninsula and ends the age of the dinosaurs, making room for mammals.'],
    ['humans', 'Modern humans', 4.3549e17, 3e5, 'life', 'Homo sapiens appears in Africa about 300,000 years ago — less than the last 0.003% of cosmic history.'],
    ['today', 'Today', 4.355e17, 0, 'now', 'The universe is 13.8 billion years old. The observable universe is about 93 billion light-years across, because space kept expanding while the light was on its way.'],
    ['andromeda', 'Milky Way meets Andromeda?', 5.8e17, null, 'future', 'The Andromeda galaxy is heading towards us at about 110 km/s. A 2025 study using Hubble and Gaia data gives roughly even odds that the two galaxies merge within 10 billion years.', 4.5e9],
    ['redgiant', 'The Sun becomes a red giant', 5.93e17, null, 'future', 'In about 5 billion years the Sun runs out of hydrogen in its core and swells into a red giant, swallowing Mercury and Venus. It then sheds its outer layers and ends as a white dwarf. Earth becomes too hot for oceans long before that, in about 1 billion years, as the Sun slowly brightens.', 5e9],
    ['laststars', 'The last stars fade', 3.2e21, null, 'future', 'In about 100 trillion years the gas for new stars is used up and the longest-lived red dwarfs burn out.', 1e14],
    ['bhera', 'The black hole era', 3.2e47, null, 'future', 'If protons decay, ordinary matter dissolves; black holes are left as the last large objects.', 1e40],
    ['heatdeath', 'Heat death', 3.2e107, null, 'future', 'After about 10¹⁰⁰ years even the biggest black holes evaporate through Hawking radiation. The universe is cold, dark and nearly empty — if dark energy keeps behaving as it does today.', 1e100]
  ];
  window.PHYS_TL_GROUPS = { early: ['First moments', '#e8735a'], stars: ['Stars and galaxies', '#f0c75e'], solar: ['Solar System', '#6aa9e0'], life: ['Life on Earth', '#8fc27a'], now: ['Now', '#ffffff'], future: ['The future', '#b58ae0'] };

  // id, name, type, mass (Suns), distance (light-years), how it was found, text
  window.PHYS_BLACKHOLES = [
    ['gaiabh1', 'Gaia BH1', 'Stellar', 9.6, 1560, 'Gaia satellite, 2022 — a Sun-like star circling an invisible partner', 'The nearest known black hole. It is dormant: it swallows no gas, so it gives off no X-rays and was found only from the wobble of its companion star.'],
    ['gaiabh3', 'Gaia BH3', 'Stellar', 33, 1926, 'Gaia satellite, 2024 — the wobble of an old companion star', 'The heaviest stellar black hole known in our galaxy. Its companion is poor in heavy elements, a clue that heavy black holes form from metal-poor stars.'],
    ['cygx1', 'Cygnus X-1', 'Stellar', 21, 7200, 'X-ray rocket, 1964; confirmed as a black hole in the 1970s', 'The first object widely accepted as a black hole. It pulls gas off a giant blue companion star; the gas heats to millions of degrees and glows in X-rays. Stephen Hawking once bet it was not a black hole — and conceded in 1990.'],
    ['gw150914', 'GW150914', 'Stellar (merger)', 62, 1.3e9, 'LIGO gravitational-wave detectors, 14 September 2015', 'The first gravitational waves ever detected: black holes of 36 and 29 Suns merged into one of 62 Suns. The missing 3 Suns of mass became energy in the ripples of space-time — for a moment more power than all the stars in the visible universe together.'],
    ['omegacen', 'Omega Centauri IMBH', 'Intermediate', 8200, 17100, 'Fast-moving stars seen with Hubble, 2024', 'Seven stars racing too fast to stay bound in the cluster point to an intermediate-mass black hole of at least 8,200 Suns — a rare “missing link” between stellar and supermassive black holes.'],
    ['sgra', 'Sagittarius A*', 'Supermassive', 4.3e6, 26700, 'Star orbits tracked for 30 years (Nobel Prize 2020); imaged by the Event Horizon Telescope in 2022', 'The black hole at the centre of our Milky Way. The star S2 swings around it every 16 years at up to 7,650 km/s. The Event Horizon Telescope photographed its shadow in 2022.'],
    ['m87', 'M87*', 'Supermassive', 6.5e9, 5.5e7, 'Event Horizon Telescope, first ever image of a black hole, April 2019', 'The first black hole ever photographed: a dark shadow inside a glowing ring of hot gas. It launches a jet of particles 5,000 light-years long at nearly the speed of light. Its event horizon is wider than Pluto’s whole orbit.'],
    ['ton618', 'TON 618', 'Supermassive', 4e10, 1.04e10, 'Quasar catalogued in 1970; mass estimated from the speed of its glowing gas', 'One of the most massive black holes known, about 40 billion Suns. It powers a quasar 140 trillion times brighter than the Sun; we see its light as it was about 10 billion years ago.']
  ];
  window.PHYS_BH_PARTS = [
    ['Singularity', 'The centre, where general relativity predicts infinite density. Most physicists expect a theory of quantum gravity to replace it with something finite.'],
    ['Event horizon', 'The point of no return, at the Schwarzschild radius r = 2GM/c². Inside it, every path — even for light — leads inwards.'],
    ['Photon sphere', 'At 1.5 times the horizon radius light can orbit the black hole in a circle. Light escaping from just outside it forms the bright ring in black-hole images.'],
    ['Innermost stable orbit', 'At 3 times the horizon radius (for a non-spinning black hole) is the closest a stable circular orbit can be. Gas that drifts inside it plunges in.'],
    ['Accretion disc', 'Gas swirling inwards rubs against itself and heats to millions of degrees. Feeding black holes turn up to 40% of the mass they swallow into light — far more than nuclear fusion’s 0.7%.'],
    ['Jets', 'Twisted magnetic fields near a spinning black hole fling particles out at almost the speed of light, sometimes for millions of light-years.'],
    ['Hawking radiation', 'Stephen Hawking showed in 1974 that quantum effects make black holes glow very faintly and slowly lose mass. For real black holes it is far too weak to detect — still a prediction.']
  ];

  // id, name, year, people, lane, status, key equation, idea, evidence / what it explains, links (ids it builds on)
  // status: est = established and tested, ok = strong evidence (nature still open), spec = speculative / untested
  window.PHYS_THEORIES = [
    ['newton', 'Newton’s laws of motion', 1687, 'Isaac Newton', 'mech', 'est', 'F = ma',
      'Objects keep moving unless a force acts; force equals mass times acceleration; every action has an equal and opposite reaction.',
      'Still used for bridges, cars and spaceflight — exact enough for anything much slower than light and bigger than atoms.', []],
    ['gravity', 'Newton’s law of gravity', 1687, 'Isaac Newton', 'mech', 'est', 'F = G·m₁·m₂ / r²',
      'Every mass attracts every other mass; the pull gets four times weaker when you double the distance. The same force drops apples and holds the Moon in orbit.',
      'Predicted Halley’s comet’s return and led to the discovery of Neptune. Fails only in very strong gravity — Mercury’s orbit gave it away.', ['newton']],
    ['thermo', 'Thermodynamics', 1850, 'Sadi Carnot, Rudolf Clausius, Lord Kelvin', 'heat', 'est', 'ΔU = Q − W',
      'Energy is never created or destroyed (first law), and the entropy — the disorder — of an isolated system never decreases (second law), which is why heat flows from hot to cold.',
      'Explains engines, fridges and why no machine can be 100% efficient.', ['newton']],
    ['em', 'Electromagnetism', 1865, 'Michael Faraday, James Clerk Maxwell', 'light', 'est', '∇·E = ρ/ε₀ (one of Maxwell’s four equations)',
      'Electricity and magnetism are two sides of one force. Changing electric fields make magnetic fields and the other way around — and together they travel as waves: light.',
      'Predicted radio waves (found by Hertz in 1887). The basis of motors, generators, radio, Wi-Fi and every electronic device.', ['newton']],
    ['stat', 'Statistical mechanics', 1877, 'Ludwig Boltzmann, James Clerk Maxwell, Josiah Gibbs', 'heat', 'est', 'S = k·ln W',
      'Heat and temperature come from the random motion of huge numbers of atoms; entropy counts the number of ways (W) the atoms can be arranged.',
      'Explains gas laws, diffusion and why the second law of thermodynamics is about probability.', ['thermo', 'newton']],
    ['special', 'Special relativity', 1905, 'Albert Einstein', 'mech', 'est', 'E = mc²',
      'The speed of light is the same for everyone. So moving clocks run slow, moving objects get shorter, nothing with mass reaches light speed, and mass is a form of energy.',
      'GPS satellites correct for it every day; particle accelerators confirm it constantly; it explains how the Sun and nuclear power release energy.', ['em', 'newton']],
    ['quantum', 'Quantum mechanics', 1925, 'Max Planck, Niels Bohr, Werner Heisenberg, Erwin Schrödinger', 'quant', 'est', 'iħ ∂ψ/∂t = Ĥψ (Schrödinger equation)',
      'At atomic scales energy comes in packets (quanta), particles behave like waves, and you can only predict probabilities. You cannot know both the exact position and momentum of a particle.',
      'Explains atoms, chemistry, lasers, transistors and LEDs — the most precisely tested theory in science.', ['em', 'stat']],
    ['general', 'General relativity', 1915, 'Albert Einstein', 'mech', 'est', 'Gμν + Λgμν = (8πG/c⁴)·Tμν',
      'Gravity is not a force but the curving of space-time by mass and energy. Matter tells space-time how to curve; curved space-time tells matter how to move.',
      'Explained Mercury’s orbit, bending of starlight (1919), black holes, gravitational waves (detected 2015) and GPS clock drift.', ['special', 'gravity']],
    ['bigbang', 'Big Bang cosmology', 1927, 'Georges Lemaître, Edwin Hubble, Alexander Friedmann', 'cosmo', 'est', 'v = H₀·d (Hubble–Lemaître law)',
      'The universe began hot and dense 13.8 billion years ago and has been expanding and cooling ever since. Distant galaxies move away faster the farther they are.',
      'Confirmed by the expansion of the universe, the cosmic microwave background (found 1965) and the amounts of hydrogen and helium.', ['general']],
    ['entangle', 'Quantum entanglement', 1964, 'Einstein–Podolsky–Rosen (1935), John Bell (1964); tested by Aspect, Clauser, Zeilinger', 'quant', 'est', 'Bell inequality: |S| ≤ 2 (quantum mechanics reaches 2√2)',
      'Two particles can share one quantum state, so measuring one instantly fixes what you will find for the other, however far apart — although no usable message can travel faster than light.',
      'Bell tests since the 1970s show nature really is like this (Nobel Prize 2022). The basis of quantum computing and quantum cryptography.', ['quantum']],
    ['qed', 'Quantum electrodynamics', 1948, 'Richard Feynman, Julian Schwinger, Sin-Itiro Tomonaga, Freeman Dyson', 'quant', 'est', 'Feynman diagrams',
      'The quantum theory of light and electric charge: charged particles interact by exchanging photons.',
      'Predicts the electron’s magnetism to more than 10 decimal places — one of the best agreements between theory and experiment ever.', ['quantum', 'special', 'em']],
    ['standard', 'The Standard Model', 1973, 'Sheldon Glashow, Steven Weinberg, Abdus Salam, Peter Higgs and many others', 'quant', 'est', '17 particles: 12 matter particles, 4 force carriers, the Higgs boson',
      'All known matter is made of quarks and leptons held together by three forces — electromagnetism and the strong and weak nuclear forces — carried by force particles. The Higgs field gives particles mass.',
      'Every particle it predicted has been found; the Higgs boson was the last, at CERN in 2012. It leaves out gravity, dark matter and neutrino masses.', ['qed']],
    ['darkmatter', 'Dark matter', 1933, 'Fritz Zwicky (1933), Vera Rubin (1970s)', 'cosmo', 'ok', 'About 85% of all matter',
      'Most matter in the universe is invisible: it does not shine or absorb light but its gravity holds galaxies and clusters together.',
      'Galaxies spin too fast for their visible mass, light bends around clusters too strongly, and the cosmic microwave background needs it. What it is made of is still unknown.', ['gravity', 'general']],
    ['hawking', 'Hawking radiation', 1974, 'Stephen Hawking', 'unify', 'spec', 'T = ħc³ / (8πGMk)',
      'Quantum effects near the event horizon make black holes glow faintly and slowly evaporate. Small black holes would be hotter and evaporate faster.',
      'Follows from combining quantum theory with general relativity, but is far too faint to observe for any real black hole. Lab analogues with sound and light behave as predicted.', ['general', 'quantum', 'stat']],
    ['inflation', 'Cosmic inflation', 1980, 'Alan Guth, Andrei Linde, Alexei Starobinsky', 'cosmo', 'ok', 'Expansion by a factor of at least 10²⁶ in about 10⁻³² s',
      'In its first instant the universe expanded exponentially, smoothing it out and stretching quantum jitters into the seeds of galaxies.',
      'Explains why the universe is so flat and uniform and matches the pattern of ripples in the microwave background. Its signature in gravitational waves has not yet been found.', ['bigbang', 'quantum']],
    ['strings', 'String theory', 1984, 'Michael Green, John Schwarz, Edward Witten and others', 'unify', 'spec', '10 or 11 dimensions',
      'Every particle is a tiny vibrating string; different vibrations are different particles. It naturally includes gravity, so it could unite all forces.',
      'Mathematically rich and has helped other fields, but it has made no prediction that has been tested.', ['standard', 'general']],
    ['lqg', 'Loop quantum gravity', 1990, 'Abhay Ashtekar, Carlo Rovelli, Lee Smolin', 'unify', 'spec', 'Smallest area ≈ Planck length² (10⁻⁷⁰ m²)',
      'Space itself is made of tiny indivisible loops woven into a network, so space and time come in discrete chunks.',
      'A rival to string theory for quantum gravity; no experimental test yet.', ['general', 'quantum']],
    ['darkenergy', 'Dark energy (ΛCDM)', 1998, 'Saul Perlmutter, Brian Schmidt, Adam Riess', 'cosmo', 'ok', 'About 68% of the universe’s energy',
      'Something makes the expansion of the universe speed up. The simplest explanation is Einstein’s cosmological constant: energy of empty space.',
      'Found from distant exploding stars (Nobel Prize 2011). Recent DESI galaxy-survey results (2024–2025) hint that dark energy may be weakening over time — still being tested.', ['bigbang', 'general']],
    ['multiverse', 'The multiverse', 1957, 'Hugh Everett (many worlds, 1957), Andrei Linde (eternal inflation, 1983)', 'unify', 'spec', '—',
      'Our universe may be one of many: branching worlds in the many-worlds reading of quantum mechanics (1957), or other bubble universes born from eternal inflation (1983).',
      'Follows from some versions of quantum theory and inflation, but other universes may be impossible to observe even in principle.', ['quantum']]
  ];
  window.PHYS_LANES = { mech: ['Motion & gravity', '#6aa9e0'], light: ['Electricity & light', '#f0c75e'], heat: ['Heat & energy', '#e8735a'], quant: ['Quantum world', '#8fc27a'], cosmo: ['The universe', '#b58ae0'], unify: ['Uniting everything', '#e07fb3'] };
  window.PHYS_STATUS = { est: ['Established — tested again and again', '#4E9E73'], ok: ['Strong evidence — details still open', '#E2A63B'], spec: ['Speculative — not yet tested', '#D8604A'] };

  // symbol, name, value, unit, plain words
  window.PHYS_CONSTANTS = [
    ['c', 'Speed of light', 299792458, 'm/s', 'Nothing with mass can reach it; light goes round the Earth 7.5 times a second.'],
    ['G', 'Gravitational constant', 6.674e-11, 'N·m²/kg²', 'Sets how strong gravity is — very weak: two 1 kg balls 1 m apart pull with 0.000 000 000 07 N.'],
    ['h', 'Planck constant', 6.62607015e-34, 'J·s', 'The size of a quantum: the energy of light is h times its frequency.'],
    ['ħ', 'Reduced Planck constant', 1.054571817e-34, 'J·s', 'h divided by 2π, used in most quantum equations.'],
    ['k', 'Boltzmann constant', 1.380649e-23, 'J/K', 'Links temperature to the energy of moving atoms.'],
    ['e', 'Elementary charge', 1.602176634e-19, 'C', 'The charge of one proton (an electron has minus this).'],
    ['mₑ', 'Electron mass', 9.1093837e-31, 'kg', 'About 1/1836 of a proton.'],
    ['mₚ', 'Proton mass', 1.67262192e-27, 'kg', 'Almost all the mass of an atom is in its protons and neutrons.'],
    ['Nₐ', 'Avogadro constant', 6.02214076e23, '/mol', 'The number of particles in one mole.'],
    ['AU', 'Astronomical unit', 1.495978707e11, 'm', 'The average Earth–Sun distance, about 150 million km.'],
    ['ly', 'Light-year', 9.4607e15, 'm', 'The distance light travels in a year — about 9.5 trillion km.'],
    ['pc', 'Parsec', 3.0857e16, 'm', 'About 3.26 light-years.'],
    ['H₀', 'Hubble constant', 70, 'km/s per megaparsec', 'How fast the universe expands. Measurements disagree (about 67 vs 73) — the “Hubble tension”.'],
    ['M☉', 'Mass of the Sun', 1.989e30, 'kg', '333,000 Earths.']
  ];

  // Light-travel destinations: name, distance in metres
  window.PHYS_PLACES = [
    ['Around the Earth (equator)', 4.0075e7], ['The Moon', 3.844e8], ['The Sun', 1.496e11], ['Mars (closest approach)', 5.46e10], ['Jupiter (at its closest, about)', 6.29e11],
    ['Pluto (from the Sun, average)', 5.906e12], ['Voyager 1 (late 2026 — almost one light-day away)', 2.58e13], ['Proxima Centauri (nearest star)', 4.0175e16], ['Sirius', 8.136e16], ['Centre of the Milky Way', 2.526e20],
    ['Andromeda galaxy', 2.4e22], ['M87* black hole', 5.2e23]
  ];

  // The four forces: name, relative strength, range, carried by, what it does
  window.PHYS_FORCES = [
    ['Strong nuclear force', '1', '10⁻¹⁵ m (inside a nucleus)', 'Gluons', 'Glues quarks into protons and neutrons and holds atomic nuclei together.'],
    ['Electromagnetism', '1/137', 'Infinite', 'Photons', 'Holds atoms and molecules together; light, electricity, magnetism, friction and the solidity of your chair.'],
    ['Weak nuclear force', '10⁻⁶', '10⁻¹⁸ m', 'W and Z bosons', 'Changes one type of quark into another: radioactive beta decay and the first step of fusion in the Sun.'],
    ['Gravity', '10⁻³⁹', 'Infinite', 'Graviton? (not found)', 'The weakest by far, but it always attracts and adds up, so it rules planets, stars and galaxies.']
  ];
})();
