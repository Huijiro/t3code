import type {
  ModelSelection as CursorSdkModelSelection,
  ModelParameterValue,
  ModelVariant,
  SDKModel,
} from "@cursor/sdk";
import type { ModelSelection, ServerProviderModel } from "@t3tools/contracts";
import { getProviderOptionCurrentValue } from "@t3tools/shared/model";

const CURSOR_SDK_PARAMETER_TO_PROVIDER_OPTION: Readonly<Record<string, string>> = {
  context: "contextWindow",
  fast: "fastMode",
};

const PROVIDER_OPTION_TO_CURSOR_SDK_PARAMETER: Readonly<Record<string, string>> = {
  contextWindow: "context",
  fastMode: "fast",
};

export function cursorSdkProviderOptionId(parameterId: string): string {
  return CURSOR_SDK_PARAMETER_TO_PROVIDER_OPTION[parameterId] ?? parameterId;
}

function cursorSdkParameterId(providerOptionId: string): string {
  return PROVIDER_OPTION_TO_CURSOR_SDK_PARAMETER[providerOptionId] ?? providerOptionId;
}

export function cursorSdkParameterPriority(parameterId: string): number {
  switch (parameterId) {
    case "effort":
    case "reasoning":
      return 0;
    case "context":
      return 1;
    case "fast":
      return 2;
    case "thinking":
      return 3;
    default:
      return 4;
  }
}

export function cursorContextWindowTokens(
  modelSelection: ModelSelection,
  models: ReadonlyArray<ServerProviderModel>,
): number | undefined {
  // The SDK forwards explicit values even when the catalog does not list them.
  const explicit = modelSelection.options?.find((option) => option.id === "contextWindow");
  let value = explicit?.value;
  if (explicit === undefined) {
    const descriptor = models
      .find((model) => model.slug === modelSelection.model)
      ?.capabilities?.optionDescriptors?.find((option) => option.id === "contextWindow");
    value = getProviderOptionCurrentValue(descriptor);
  }
  const match = /^(\d+)([km])$/i.exec(typeof value === "string" ? value.trim() : "");
  if (match === null) return undefined;
  const tokens = Number(match[1]) * (match[2]?.toLowerCase() === "m" ? 1_000_000 : 1_000);
  return Number.isSafeInteger(tokens) && tokens > 0 ? tokens : undefined;
}

function variantMatchesParams(
  variant: ModelVariant,
  params: ReadonlyArray<ModelParameterValue> | undefined,
): boolean {
  if (params === undefined || params.length === 0) {
    return variant.isDefault === true || variant.params.length === 0;
  }
  return params.every((param) =>
    variant.params.some((entry) => entry.id === param.id && entry.value === param.value),
  );
}

/** True when every catalog variant consistent with `params` requires max mode. */
export function cursorSdkMaxModeForParams(
  model: Pick<SDKModel, "variants">,
  params: ReadonlyArray<ModelParameterValue> | undefined,
): boolean {
  const variants = model.variants ?? [];
  const matching = variants.filter((variant) => variantMatchesParams(variant, params));
  return matching.length > 0 && matching.every((variant) => variant.isMaxMode === true);
}

export function cursorSdkModelSelection(
  modelSelection: ModelSelection,
  sdkModels?: ReadonlyArray<Pick<SDKModel, "id" | "variants">>,
): CursorSdkModelSelection {
  const id = modelSelection.model === "auto" ? "default" : modelSelection.model;
  const params =
    modelSelection.options === undefined || modelSelection.options.length === 0
      ? undefined
      : modelSelection.options.map((option): ModelParameterValue => ({
          id: cursorSdkParameterId(option.id),
          value: String(option.value),
        }));
  const catalogModel = sdkModels?.find((model) => model.id === id);
  const maxMode =
    catalogModel === undefined ? false : cursorSdkMaxModeForParams(catalogModel, params);
  return {
    id,
    ...(params === undefined ? {} : { params }),
    ...(maxMode ? { maxMode: true } : {}),
  };
}
