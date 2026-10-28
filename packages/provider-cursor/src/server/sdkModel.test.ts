import { describe, expect, it } from "@effect/vitest";
import { ProviderInstanceId } from "@t3tools/contracts";
import { cursorSdkMaxModeForParams, cursorSdkModelSelection } from "./sdkModel.ts";

describe("cursorSdkModelSelection", () => {
  const instanceId = ProviderInstanceId.make("cursor");

  it("sets maxMode when every matching catalog variant requires it", () => {
    const selection = cursorSdkModelSelection(
      {
        instanceId,
        model: "claude-opus-4-8",
        options: [{ id: "contextWindow", value: "1m" }],
      },
      [
        {
          id: "claude-opus-4-8",
          variants: [
            {
              displayName: "1M",
              isMaxMode: true,
              params: [{ id: "context", value: "1m" }],
            },
          ],
        },
      ],
    );
    expect(selection).toEqual({
      id: "claude-opus-4-8",
      params: [{ id: "context", value: "1m" }],
      maxMode: true,
    });
  });

  it("omits maxMode when a matching variant can run without it", () => {
    expect(
      cursorSdkMaxModeForParams(
        {
          variants: [
            {
              displayName: "1M",
              isMaxMode: true,
              params: [{ id: "context", value: "1m" }],
            },
            {
              displayName: "1M standard",
              params: [{ id: "context", value: "1m" }],
            },
          ],
        },
        [{ id: "context", value: "1m" }],
      ),
    ).toBe(false);
  });
});
