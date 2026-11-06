export const fixtures = [
  [
    "curved-logo",
    '<path fill="#e64b35" fill-rule="evenodd" d="M48 6C78 6 88 28 83 43C95 66 74 81 55 76C29 92 9 71 16 52C1 31 22 9 38 18ZM34 33C24 46 36 66 52 58C68 48 53 23 34 33Z"/><circle cx="78" cy="10" r="2" fill="#204938"/>',
  ],
  [
    "shared-colours",
    '<path d="M8 20Q48-12 88 20V64Q48 96 8 64Z" fill="#e64b35"/><path d="M8 20Q48 48 88 20V64Q48 42 8 64Z" fill="#214b39"/><path d="M28 18Q70 42 30 72Q62 44 28 18Z" fill="#e7b844"/>',
  ],
  [
    "thin-bridges",
    '<g stroke="#204938" stroke-width="1.4" fill="none"><path d="M8 62C16 2 68 82 88 12"/><circle cx="48" cy="40" r="25"/><path d="M20 55L73 28"/></g><circle cx="82" cy="68" r="1.5" fill="#e64b35"/>',
  ],
  [
    "small-type",
    '<text x="5" y="35" font-family="sans-serif" font-size="23" font-weight="bold" fill="#233d32">TYPE</text><text x="6" y="56" font-family="sans-serif" font-size="11" fill="#233d32">fine details</text>',
  ],
  [
    "opaque-art",
    '<rect width="96" height="80" fill="#e8dbc4"/><path d="M0 55L25 9L56 62L77 32L96 52V80H0Z" fill="#345b4d"/><circle cx="75" cy="15" r="9" fill="#cb6544"/><path d="M0 70Q48 29 96 72V80H0Z" fill="#799b6c"/>',
  ],
  [
    "translucent",
    '<rect x="8" y="8" width="80" height="64" rx="12" fill="#2673a4" fill-opacity=".35"/><circle cx="48" cy="40" r="22" fill="#cf3045" fill-opacity=".65"/>',
  ],
];

fixtures.push([
  "small-type-opaque",
  '<rect width="96" height="80" fill="white"/>' +
    fixtures.find(([name]) => name === "small-type")[1],
]);
