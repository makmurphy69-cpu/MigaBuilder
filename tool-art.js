/* One small original figure and restrained abstract art per tool header. */
(function () {
  function decorate() {
    var header = document.querySelector('header.masthead') || document.querySelector('section#start.card');
    if (!header || !header.querySelector('h1') || header.classList.contains('home-hero')) return;
    var slug = location.pathname.split('/').pop().replace(/\.html$/, '');
    var hash = 0;
    for (var i = 0; i < slug.length; i++) hash = ((hash * 31) + slug.charCodeAt(i)) >>> 0;
    var palettes = [
      ['#6fd1e0', '#e2a63b'], ['#98cba3', '#e9a66e'],
      ['#c6a9ec', '#6fd1e0'], ['#e9b3a5', '#e2a63b'],
      ['#85bbef', '#a7d7c1'], ['#e8cc83', '#c4aae3']
    ];
    var palette = palettes[hash % palettes.length];
    header.classList.add('miga-art');
    header.dataset.art = String(1 + (hash % 3));
    header.style.setProperty('--art-a', palette[0]);
    header.style.setProperty('--art-b', palette[1]);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'miga-figure');
    svg.setAttribute('viewBox', '0 0 110 120');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    // The small object the character holds changes with each tool, without text or network assets.
    var motifs = [
      '<circle cx="82" cy="56" r="12" fill="none" stroke="' + palette[1] + '" stroke-width="3"/>',
      '<path d="M71 67 L82 45 L94 67 Z" fill="none" stroke="' + palette[1] + '" stroke-width="3"/>',
      '<rect x="72" y="46" width="22" height="22" rx="3" fill="none" stroke="' + palette[1] + '" stroke-width="3"/>',
      '<path d="M72 48 h22 v18 H72 z M76 54 h13 M76 59 h9" fill="none" stroke="' + palette[1] + '" stroke-width="2"/>'
    ];
    svg.innerHTML = '<ellipse cx="48" cy="108" rx="33" ry="5" fill="#081826" opacity=".45"/>' +
      '<path d="M30 75 Q18 84 23 104 M55 75 Q71 86 65 104" fill="none" stroke="' + palette[0] + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M26 48 Q23 42 30 39 L61 39 Q68 42 67 48 L64 77 Q45 87 28 77 Z" fill="#eae5d7" stroke="' + palette[0] + '" stroke-width="3"/>' +
      '<path d="M33 38 Q20 30 28 18 Q40 5 60 17 Q71 26 61 38 Z" fill="' + palette[0] + '" stroke="#081826" stroke-width="3"/>' +
      '<circle cx="39" cy="27" r="2.5" fill="#081826"/><circle cx="54" cy="27" r="2.5" fill="#081826"/>' +
      '<path d="M41 33 Q47 38 53 33" fill="none" stroke="#081826" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M64 55 Q75 65 78 61" fill="none" stroke="' + palette[0] + '" stroke-width="6" stroke-linecap="round"/>' +
      motifs[hash % motifs.length];
    header.appendChild(svg);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate);
  else decorate();
})();
