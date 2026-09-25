// node --test scripts/setup-local
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EnvFile,
  isPlaceholder,
  mergeCorsOrigins,
  missingManual,
  randomApiKeyPair,
  resolvePair,
  splitPair,
} from "./lib.mjs";

describe("EnvFile", () => {
  const text = [
    "# comment",
    "PLAIN=value",
    'QUOTED="with space"',
    "EMPTY=",
    'EMPTY_QUOTED=""',
    "INLINE=abc # note",
    "",
  ].join("\n");

  it("reads plain, quoted, empty and commented values", () => {
    const env = new EnvFile(text);
    assert.equal(env.get("PLAIN"), "value");
    assert.equal(env.get("QUOTED"), "with space");
    assert.equal(env.get("EMPTY"), "");
    assert.equal(env.get("EMPTY_QUOTED"), "");
    assert.equal(env.get("INLINE"), "abc");
    assert.equal(env.get("ABSENT"), "");
  });

  it("keeps quoting and every untouched line when setting", () => {
    const env = new EnvFile(text);
    env.set("EMPTY_QUOTED", "x");
    env.set("EMPTY", "y");
    assert.equal(
      env.toString(),
      text
        .replace('EMPTY_QUOTED=""', 'EMPTY_QUOTED="x"')
        .replace("EMPTY=\n", "EMPTY=y\n"),
    );
  });

  it("appends a missing key before the trailing newline", () => {
    const env = new EnvFile("A=1\n");
    env.set("B", "2");
    assert.equal(env.toString(), "A=1\nB=2\n");
  });

  it("fill never overwrites a set value", () => {
    const env = new EnvFile("A=keep\nB=\n");
    assert.equal(env.fill("A", "new"), false);
    assert.equal(env.fill("B", "new"), true);
    assert.equal(env.toString(), "A=keep\nB=new\n");
    assert.deepEqual(env.changed, ["B"]);
  });
});

describe("mergeCorsOrigins", () => {
  // `*` makes the API drop credentials, and the apps send them.
  it("replaces a wildcard with the explicit origins", () => {
    assert.deepEqual(mergeCorsOrigins("*", ["http://localhost:5173"]), {
      value: "http://localhost:5173",
      replacedWildcard: true,
    });
  });

  it("extends an explicit list without dropping or duplicating", () => {
    assert.equal(
      mergeCorsOrigins("https://app.example.com, http://localhost:5173", [
        "http://localhost:5173",
        "http://localhost:5174",
      ]).value,
      "https://app.example.com,http://localhost:5173,http://localhost:5174",
    );
  });
});

describe("api key pairs", () => {
  it("are shaped like the API key and never contain the separator", () => {
    const { key, secret } = randomApiKeyPair();
    assert.match(key, /^local_[A-Za-z0-9]{25}$/);
    assert.match(secret, /^[A-Za-z0-9]{35}$/);
  });

  it("split only well-formed key:secret values", () => {
    assert.deepEqual(splitPair("k:s"), { key: "k", secret: "s" });
    assert.equal(splitPair(""), null);
    assert.equal(splitPair("k:"), null);
    assert.equal(splitPair("k:s:x"), null);
  });
});

function slot(initial = null, label = "slot") {
  let value = initial;
  return {
    label,
    read: () => value,
    write: (p) => (value = p),
    get: () => value,
  };
}

describe("resolvePair", () => {
  const fresh = { key: "gen", secret: "gen" };

  it("generates one pair and gives it to everyone when nobody has one", () => {
    const owner = slot();
    const a = slot();
    const b = slot();
    const r = resolvePair({ owner, consumers: [a, b], generate: () => fresh });
    assert.equal(r.generated, true);
    assert.deepEqual([owner.get(), a.get(), b.get()], [fresh, fresh, fresh]);
  });

  it("copies the owner's pair to empty consumers", () => {
    const pair = { key: "k", secret: "s" };
    const owner = slot(pair);
    const a = slot();
    const r = resolvePair({ owner, consumers: [a], generate: () => fresh });
    assert.equal(r.generated, false);
    assert.deepEqual(a.get(), pair);
  });

  // e.g. a developer already pasted the key the seed printed into the app.
  it("adopts a consumer's pair when the owner has none", () => {
    const pair = { key: "k", secret: "s" };
    const owner = slot();
    const a = slot(pair);
    const b = slot();
    resolvePair({ owner, consumers: [a, b], generate: () => fresh });
    assert.deepEqual([owner.get(), b.get()], [pair, pair]);
  });

  it("reports a consumer holding a different pair instead of overwriting it", () => {
    const owner = slot({ key: "k", secret: "s" });
    const remote = slot({ key: "other", secret: "x" }, "apps/admin/.env");
    const r = resolvePair({
      owner,
      consumers: [remote],
      generate: () => fresh,
    });
    assert.deepEqual(r.conflicts, ["apps/admin/.env"]);
    assert.deepEqual(remote.get(), { key: "other", secret: "x" });
  });
});

describe("manual values", () => {
  it("treats example placeholders as unset", () => {
    assert.equal(isPlaceholder(""), true);
    assert.equal(
      isPlaceholder("your-64-char-secret-token-here_replace-this-value"),
      true,
    );
    assert.equal(isPlaceholder("sk-or-real"), false);
  });

  it("lists only what is still empty, required first-class", () => {
    const files = {
      api: new EnvFile("RESEND_API_KEY=re_x\nEMAIL_FROM=\n"),
      ai: new EnvFile("OPENROUTER_API_KEY=\n"),
      app: new EnvFile(""),
    };
    const missing = missingManual(files);
    assert.deepEqual(
      missing.map((g) => [g.group, g.values.map((v) => v.key)]).slice(0, 2),
      [
        ["LLM access", ["OPENROUTER_API_KEY"]],
        ["Email (invitations, password reset)", ["EMAIL_FROM"]],
      ],
    );
    assert.deepEqual(
      missingManual(files, { requiredOnly: true }).map((g) => g.group),
      ["LLM access"],
    );
  });
});
