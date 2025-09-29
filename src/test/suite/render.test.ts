import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { buildFeatureHover } from "../../hover/render/index";
import { scoreFeature } from "../../core/scoring";
import type { BaselineFeature, BrowserKey, SupportMatrix } from "../../core/baselineData";

const supportMatrix = (versions: Partial<Record<BrowserKey, number>>): SupportMatrix => {
  const matrix: SupportMatrix = {};
  for (const [key, version] of Object.entries(versions)) {
    if (version === undefined) {
      continue;
    }
    matrix[key as BrowserKey] = { raw: version.toString(), version };
  }
  return matrix;
};

function buildFeature(partial: Partial<BaselineFeature>): BaselineFeature {
  return {
    id: partial.id ?? "feature-id",
    name: partial.name ?? "Feature Name",
    baseline: partial.baseline ?? null,
    support: partial.support ?? {},
    specUrls: partial.specUrls ?? [],
    caniuseIds: partial.caniuseIds ?? [],
    compatFeatures: partial.compatFeatures ?? [],
    groups: partial.groups ?? [],
    snapshots: partial.snapshots ?? [],
    discouraged: partial.discouraged,
    description: partial.description,
    descriptionHtml: partial.descriptionHtml,
    baselineLowDate: partial.baselineLowDate,
    baselineHighDate: partial.baselineHighDate,
    docsUrl: partial.docsUrl
  };
}

suite("rendering hover content", () => {
  const assetsRoot = vscode.Uri.file(path.resolve(__dirname, "../../..", "media", "baseline"));

  function renderHover(feature: BaselineFeature, verdict: Parameters<typeof buildFeatureHover>[1], target: Parameters<typeof buildFeatureHover>[2]) {
    return buildFeatureHover(feature, verdict, target, { assetsRoot });
  }

  test("high baseline feature produces a success badge and summary", () => {
    const feature = buildFeature({
      name: "*Fancy* Feature",
      baseline: "high",
      baselineLowDate: "2024-01",
      baselineHighDate: "2024-05",
      support: supportMatrix({ chrome: 130, edge: 130, firefox: 130, safari: 18 }),
      description: "Rich feature description.",
      docsUrl: "https://example.com/docs",
      specUrls: ["https://drafts.csswg.org/fancy/"],
      caniuseIds: ["fancy"],
      compatFeatures: ["api.Fancy"],
      groups: [{ id: "animation", name: "Animation" }],
      snapshots: [{ id: "spec-2024", name: "Spec 2024" }]
    });

    const verdict = scoreFeature(feature.support, "modern");
    const md = renderHover(feature, verdict, "modern");
    const value = md.value;

    assert.match(value, /\*\*\\\*Fancy\\\* Feature\*\*/);
    assert.match(value, /\$\(check\) Safe/);
    assert.match(value, /<img src=".*baseline-widely-icon\.svg".*>\s*&nbsp;Baseline: \*\*High\*\* \(2024-01 → 2024-05\)/);
    assert.match(value, /Feature meets the Modern baseline\./);
    assert.match(value, /\*\*Desktop support\*\*/);
    assert.match(value, /Groups: Animation/);
    assert.ok(value.includes("drafts.csswg.org"));
    assert.ok(
      value.includes("command:baseline-gate.openDocs?%7B%22id%22%3A%22feature-id%22%7D"),
      "encoded docs command should be present"
    );
  });

  test("missing support data yields warnings and fallback guidance", () => {
    const feature = buildFeature({
      baseline: "low",
      support: supportMatrix({ chrome: 118, edge: 118, firefox: 116 }),
      description: undefined
    });

    const md = renderHover(feature, "warning", "enterprise");
    const value = md.value;

    assert.match(value, /\$\(warning\) Needs review/);
    assert.match(value, /Support data is incomplete for Safari/);
    assert.match(value, /Guard usage with runtime feature detection/);
    assert.ok(!value.includes("Feature meets the Enterprise baseline."));
    assert.match(value, /Needs review for \*\*Enterprise\*\* targets/);
    assert.match(value, /Safari \| — \|/);
  });

  test("blocked verdict explains gaps, missing baseline, and docs fallback", () => {
    const feature = buildFeature({
      baseline: null,
      support: supportMatrix({ chrome: 100, edge: 100, firefox: 110, safari: 15 })
    });

    const md = renderHover(feature, "blocked", "enterprise");
    const value = md.value;

    assert.match(value, /\$\(circle-slash\) Blocked/);
    assert.match(value, /Progressively enhance for Chrome \(needs 114\)/);
    assert.match(value, /Not part of Baseline yet;/);
    assert.match(value, /Guard usage with runtime feature detection/);
  });

  test("features without documentation include the baseline guide and Gemini quick action", () => {
    const feature = buildFeature({
      docsUrl: undefined,
      support: supportMatrix({ chrome: 130, edge: 130, firefox: 130, safari: 18 })
    });

    const md = renderHover(feature, "safe", "modern");
    const value = md.value;

    const resourcesSectionMatch = /\*\*Resources\*\*\n([\s\S]*?)\n\n---/.exec(value);
    assert.ok(resourcesSectionMatch, "resources section should precede Gemini actions");

    const resourceLinks = resourcesSectionMatch[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "));

    assert.deepStrictEqual(
      resourceLinks,
      ["- [Baseline guide ↗](https://web.dev/articles/baseline-tools-web-features)"],
      "baseline guide should remain the only resource link"
    );

    assert.ok(value.includes("$(sparkle) Fix with Gemini"), "Gemini quick action should be present");
    assert.ok(
      value.includes("command:baseline-gate.startGeminiChat?"),
      "Gemini command should be encoded in the hover"
    );
  });

  test("fallback tips collapse duplicate guidance", () => {
    const feature = buildFeature({
      baseline: null,
      support: supportMatrix({ chrome: 100 })
    });

    const md = renderHover(feature, "warning", "enterprise");
    const fallbackBlock = md.value
      .split("**Next steps**")[1]
      .split("Baseline guide")[0];

    const lines = fallbackBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"));

    const uniqueLines = new Set(lines);
    assert.strictEqual(lines.length, uniqueLines.size, "dedupe should remove repeated fallback messages");
  });

  test("discouraged features surface sources and alternatives", () => {
    const feature = buildFeature({
      baseline: "low",
      discouraged: {
        accordingTo: [
          "https://web.dev/patterns/bad-idea",
          "https://example.com/avoid"
        ],
        alternatives: ["css-grid", "flexbox"]
      },
      support: supportMatrix({ chrome: 118, edge: 118, firefox: 118, safari: 17 })
    });

    const md = renderHover(feature, "warning", "modern");
    const discouragedBlock = md.value
      .split("$(alert) **Discouraged**")[1]
      .split("\n\n")[0];

    assert.ok(
      discouragedBlock.includes("[web.dev](https://web.dev/patterns/bad-idea)"),
      "should include formatted host name for first discouraged source"
    );
    assert.ok(
      discouragedBlock.includes("[example.com](https://example.com/avoid)"),
      "should include formatted host name for second discouraged source"
    );
    assert.ok(
      discouragedBlock.includes("Alternatives: `css-grid`, `flexbox`"),
      "should list alternative suggestions in inline code"
    );
  });

  test("support tables highlight release dates, gaps, and missing data", () => {
    const feature = buildFeature({
      support: {
        chrome: { raw: "113", version: 113, releaseDate: "2024-05-01" },
        edge: { raw: "114", version: 114 },
        firefox: { raw: "beta" }
      }
    });

    const md = renderHover(feature, "warning", "enterprise");
    const value = md.value;

    assert.match(
      value,
      /\| Chrome \| `113` \(May [0-9]{1,2}, 2024\) \| ≥`114` \| ⛔ Gap \|/,
      "Chrome row should include formatted release date and gap status"
    );
    assert.match(
      value,
      /\| Edge \| `114` \| ≥`114` \| ✅ Meets target \|/,
      "Edge row should mark target met"
    );
    assert.match(
      value,
      /\| Firefox \| `beta` \| ≥`115` \| ⚠️ Missing data \|/,
      "Firefox row should surface missing numeric version"
    );
    assert.match(
      value,
      /\| Safari \| — \| ≥`16.4` \| ⚠️ Missing data \|/,
      "Safari row should warn when data is absent"
    );
  });
});
