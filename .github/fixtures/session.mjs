import assert from "node:assert/strict";

globalThis.fetch = async (url, { headers }) => {
  assert.equal(url.origin + url.pathname, "https://api.pokerbankrolltracker.net/v1/sessions");
  assert.equal(headers.Authorization, "Bearer ci-fixture");
  assert.equal(url.searchParams.get("start"), "2026-03-15");
  assert.equal(url.searchParams.get("type"), "cashgame");
  assert.equal(url.searchParams.get("currency"), "USD");

  return Response.json({
    data: [
      {
        id: 1,
        type: "cashgame",
        start: "2026-03-15 19:00:00",
        location: "CI fixture",
        location_type: "Casino",
        currency: "USD",
        buyin: 500,
        cashout: 1200,
        private: false,
      },
    ],
  });
};
