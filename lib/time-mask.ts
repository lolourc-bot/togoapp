/**
 * Mask for mm:ss fields (paces, times): keeps digits only and adds the ":" by itself once two digits are typed
 * ("4530" → "45:30"). Typing ":" by hand still works for one-digit minutes ("5:30"). When deleting, the colon
 * isn't put back, so "45:" can be erased normally.
 */
export function maskMinSec(next: string, prev = ""): string {
  const deleting = next.length < prev.length;
  const v = next.replace(/[^\d:]/g, "");
  const hasColon = v.includes(":");
  const [head = "", ...tail] = v.split(":");
  let mm = head;
  let ss = tail.join("");
  if (!hasColon && mm.length > 2) {
    ss = mm.slice(2);
    mm = mm.slice(0, 2);
  }
  mm = mm.slice(0, 2);
  ss = ss.slice(0, 2);
  if (hasColon || ss) return `${mm}:${ss}`;
  if (mm.length === 2 && !deleting) return `${mm}:`;
  return mm;
}
