// EyebrowLabel — INTENTIONALLY DISABLED.
// User feedback: "drop eyebrows". Renders nothing so existing call sites
// don't have to be edited individually; future pages should just stop
// importing this. Component kept around as a no-op rather than removed
// to avoid breaking imports across the tree.

type Tone = "dim" | "accent" | "warm" | "good" | "warn" | "bad" | "purple";

export function EyebrowLabel(_props: { children: React.ReactNode; tone?: Tone }) {
  return null;
}
