import { countries } from "./place-aliases";

const MAX_LOCATION_LENGTH = 200;

const wordsOf = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);

function namesPlace(text: string, place: string): boolean {
  const haystack = wordsOf(text);
  const needle = wordsOf(place);
  if (needle.length === 0) return false;
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    if (needle.every((word, offset) => haystack[start + offset] === word)) return true;
  }
  return false;
}

const isRemote = (place: string) => namesPlace(place, "remote");

function placesMeantBy(target: string): readonly string[] {
  const wanted = target.trim().toLowerCase();
  const country = countries.find(({ names }) => names.some((name) => name.toLowerCase() === wanted));
  return country ? [...country.names, ...country.cities] : [target];
}

export function matchesLocation(location: string, targets: readonly string[]): boolean {
  if (targets.length === 0) return true;
  if (location.length > MAX_LOCATION_LENGTH) return false;
  if (isRemote(location)) return targets.some(isRemote);
  return targets.some(
    (target) =>
      placesMeantBy(target).some((place) => namesPlace(location, place)) || namesPlace(target, location),
  );
}

export function matchesIndustry(industry: string, targets: readonly string[]): boolean {
  return targets.length === 0 || targets.includes(industry.trim().toLowerCase());
}
