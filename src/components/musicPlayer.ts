export function secondsToString(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds - minutes * 60;

  return `${minutes < 10 ? "0" : ""}${minutes}:${sec < 10 ? "0" : ""}${sec}`;
}
