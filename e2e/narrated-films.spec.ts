import { test, expect } from "@playwright/test";
import { filmCollection } from "../src/lib/mlai/categories/film-collection";

test("the six exported films load on intent with captions and working downloads", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const requested: string[] = [];
  page.on("request", (request) => {
    if (/\/media\/films\/.*\.mp4/.test(request.url())) requested.push(request.url());
  });
  await page.goto("/showcase");
  const collection = page.getByRole("region", { name: "The narrated collection" });
  await expect(collection.getByRole("button", { name: /^Play / })).toHaveCount(6);
  expect(requested).toEqual([]);
  for (const film of filmCollection) {
    const card = collection
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: film.title, exact: true }) });
    await expect(card.getByRole("link", { name: "Download MP4" })).toHaveAttribute(
      "href",
      `/media/films/${film.id}.mp4`,
    );
    const response = await request.get(`/media/films/${film.id}.mp4`, {
      headers: { Range: "bytes=0-31" },
    });
    expect(response.status()).toBe(206);
    expect((await response.body()).length).toBe(32);
    await card.getByRole("button", { name: `Play ${film.title}`, exact: true }).click();
    const video = card.locator("video");
    await video.evaluate((element) => {
      (element as HTMLVideoElement).muted = true;
    });
    await expect
      .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        video.evaluate((element) => (element as HTMLVideoElement).textTracks[0]?.cues?.length),
      )
      .toBe(film.cues.length);
    await video.evaluate((element) => (element as HTMLVideoElement).pause());
    expect(await video.evaluate((element) => (element as HTMLVideoElement).error)).toBeNull();
    expect(await (await request.get(`/media/films/${film.id}.transcript.txt`)).text()).toBe(
      film.cues.map((cue) => cue.text).join("\n\n") + "\n",
    );
  }
});

test("a failed export keeps transcript access and can reset its player", async ({ page }) => {
  await page.route("**/media/films/film.mp4", (route) => route.fulfill({ status: 503 }));
  await page.goto("/showcase");
  const collection = page.getByRole("region", { name: "The narrated collection" });
  const card = collection.locator("li").first();
  await card.getByRole("button", { name: "Play Private AI operations", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("Playback could not load");
  await expect(card.getByRole("link", { name: "Transcript", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Reset player" }).click();
  await expect(
    card.getByRole("button", { name: "Play Private AI operations", exact: true }),
  ).toBeVisible();
});
