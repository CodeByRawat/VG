// Parses a timestamped YouTube script into { timestamp, narration } segments.
// Handles inline timestamps like "(0:07) text", ranges like
// "(0:00 - 0:17) paragraph", and simple "0:00 - text" lines, all in the
// same script.
const TIMESTAMP_REGEX =
  /\(?\s*(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*[-–]\s*(\d{1,2}:\d{2}(?::\d{2})?))?\s*\)?\s*/g;

export function parseScript(script) {
  const matches = [...script.matchAll(TIMESTAMP_REGEX)];
  const segments = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match[1];
    const end = match[2];
    const timestamp = end ? `${start}-${end}` : start;

    const textStart = match.index + match[0].length;
    const textEnd = i + 1 < matches.length ? matches[i + 1].index : script.length;
    const narration = script.slice(textStart, textEnd).trim();

    if (narration) {
      segments.push({ timestamp, narration });
    }
  }

  return segments;
}

// Converts a timestamp like "0:07" or "0:00-0:17" into a filename-safe
// string like "0-07" or "0-00-0-17".
export function timestampToFilename(timestamp) {
  return timestamp.replace(/:/g, '-');
}

const isOneOrTwoDigits = (part) => /^\d{1,2}$/.test(part);
const isTwoDigits = (part) => /^\d{2}$/.test(part);

// Inverts timestampToFilename. The part count alone is enough to
// disambiguate: a single "M:SS" timestamp always dash-splits into 2
// parts, "H:MM:SS" into 3, and a range doubles whichever of those it
// wraps (4 or 6). Returns null if the name doesn't fit any of those
// shapes (e.g. it isn't one of this app's downloaded filenames).
export function filenameToTimestamp(nameWithoutExtension) {
  const parts = nameWithoutExtension.split('-');

  if (parts.length === 2 && isOneOrTwoDigits(parts[0]) && isTwoDigits(parts[1])) {
    return `${parts[0]}:${parts[1]}`;
  }
  if (
    parts.length === 3 &&
    isOneOrTwoDigits(parts[0]) &&
    isTwoDigits(parts[1]) &&
    isTwoDigits(parts[2])
  ) {
    return `${parts[0]}:${parts[1]}:${parts[2]}`;
  }
  if (
    parts.length === 4 &&
    isOneOrTwoDigits(parts[0]) &&
    isTwoDigits(parts[1]) &&
    isOneOrTwoDigits(parts[2]) &&
    isTwoDigits(parts[3])
  ) {
    return `${parts[0]}:${parts[1]}-${parts[2]}:${parts[3]}`;
  }
  if (
    parts.length === 6 &&
    isOneOrTwoDigits(parts[0]) &&
    isTwoDigits(parts[1]) &&
    isTwoDigits(parts[2]) &&
    isOneOrTwoDigits(parts[3]) &&
    isTwoDigits(parts[4]) &&
    isTwoDigits(parts[5])
  ) {
    return `${parts[0]}:${parts[1]}:${parts[2]}-${parts[3]}:${parts[4]}:${parts[5]}`;
  }
  return null;
}
